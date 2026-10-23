import { randomUUID } from 'node:crypto'
import { createSeedState } from '../data/seed.js'
import { HttpError } from '../http/errors.js'
import { deleteStatement, derivedKeys, fromRow, metaKeys, selectSql, tables, upsertStatement } from './portalTables.js'

const clone = value => structuredClone(value)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const DAY = 86_400_000
const manilaDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const addDays = (date, amount) => manilaDate(new Date(`${date}T12:00:00+08:00`).getTime() + amount * DAY)

// Same interface as InMemoryPortalRepository. The working copy stays in memory so the
// synchronous services are unchanged; every change is queued as SQL and written by
// commit(), which the HTTP layer awaits before reporting success. A failed commit
// restores the last committed state. Verification challenges and receipts remain
// in memory because they expire within minutes.
export class PostgresPortalRepository {
  storeName = 'postgres'
  #pool
  #clock
  #allowReset
  #state
  #committedState
  #sessions = new Map()
  #committedSessions = new Map()
  #challenges = new Map()
  #receipts = new Map()
  #pending = []

  constructor({ pool, clock = () => new Date(), allowReset = false }) {
    this.#pool = pool
    this.#clock = clock
    this.#allowReset = allowReset
  }

  static async connect(options) {
    const repository = new PostgresPortalRepository(options)
    await repository.#load()
    return repository
  }

  get clock() { return this.#clock }

  // ---------- state access (same contract as the in-memory repository) ----------

  readState() { return clone(this.#materialize(this.#state)) }

  transaction(change) {
    const next = clone(this.#materialize(this.#state))
    const result = change(next)
    next.revision += 1
    for (const key of derivedKeys) delete next[key]
    this.#queueDiff(this.#state, next)
    this.#state = next
    return clone(result)
  }

  reset() {
    if (!this.#allowReset) throw new HttpError(403, 'RESET_DISABLED', 'Resetting data is disabled while the database is connected')
    const seeded = this.#seedState()
    this.#pending.push(...[...tables].reverse().map(spec => ({ text: `delete from public.${spec.table}`, values: [] })))
    this.#pending.push({ text: 'delete from public.sessions', values: [] })
    this.#queueFullInsert(seeded)
    this.#state = seeded
    this.#sessions.clear()
    this.#challenges.clear()
    this.#receipts.clear()
    return this.readState()
  }

  findAccountById(id) { return clone(this.#state.accounts.find(account => account.id === id) || null) }
  findAccountByStudentId(studentId) { return clone(this.#state.accounts.find(account => account.studentId.toUpperCase() === String(studentId).trim().toUpperCase()) || null) }
  findAccountByEmail(email) { return clone(this.#state.accounts.find(account => account.email.toLowerCase() === String(email).trim().toLowerCase()) || null) }
  listAccounts() { return clone(this.#state.accounts) }
  createAccount(account) { return this.transaction(state => { state.accounts.push(account); state.members[account.id] = { role: 'student', position: '', scope: '', course: account.course }; return account }) }
  updateAccount(id, patch) { return this.transaction(state => { const account = state.accounts.find(item => item.id === id); if (!account) return null; Object.assign(account, patch); return account }) }
  updateMembership(id, membership) { return this.transaction(state => { state.members[id] = { ...(state.members[id] || {}), ...membership }; return state.members[id] }) }

  createSession(session) {
    this.#sessions.set(session.id, clone(session))
    this.#pending.push({ text: 'insert into public.sessions (id, account_id, issued_at, expires_at) values ($1, $2, $3, $4)', values: [session.id, session.accountId, session.issuedAt, session.expiresAt] })
    return clone(session)
  }
  findSession(id) { return clone(this.#sessions.get(id) || null) }
  deleteSession(id) {
    this.#pending.push({ text: 'delete from public.sessions where id = $1', values: [id] })
    return this.#sessions.delete(id)
  }

  createChallenge(challenge) { this.#challenges.set(challenge.id, clone(challenge)); return clone(challenge) }
  findChallenge(id) { return clone(this.#challenges.get(id) || null) }
  findRecentChallenge({ email, purpose, accountId, since }) {
    return clone([...this.#challenges.values()].find(challenge => challenge.email === email
      && challenge.purpose === purpose && challenge.accountId === accountId && challenge.createdAt >= since) || null)
  }
  recordChallengeAttempt(id) {
    const challenge = this.#challenges.get(id)
    if (!challenge) return null
    challenge.attempts = (challenge.attempts || 0) + 1
    return clone(challenge)
  }
  consumeChallenge(id) { const value = this.findChallenge(id); this.#challenges.delete(id); return value }
  createReceipt(receipt) { this.#receipts.set(receipt.id, clone(receipt)); return clone(receipt) }
  consumeReceipt(id) { const value = clone(this.#receipts.get(id) || null); this.#receipts.delete(id); return value }
  nextId(prefix) { return `${prefix}-${randomUUID()}` }

  // ---------- persistence ----------

  hasPendingChanges() { return this.#pending.length > 0 }

  async commit() {
    if (!this.#pending.length) return
    const statements = this.#pending
    this.#pending = []
    const client = await this.#pool.connect().catch(error => { this.rollback(); throw translate(error) })
    try {
      await client.query('begin')
      for (const statement of statements) await client.query(statement.text, statement.values)
      await client.query('commit')
    } catch (error) {
      await client.query('rollback').catch(() => {})
      this.rollback()
      throw translate(error)
    } finally {
      client.release()
    }
    this.#committedState = this.#state
    this.#committedSessions = new Map(this.#sessions)
  }

  rollback() {
    this.#state = this.#committedState
    this.#sessions = new Map(this.#committedSessions)
    this.#pending = []
  }

  async #load() {
    const client = await this.#pool.connect()
    try {
      const { rows: [{ count }] } = await client.query('select count(*)::int as count from public.accounts')
      if (count === 0) {
        const seeded = this.#seedState()
        this.#queueFullInsert(seeded)
        this.#state = seeded
        this.#committedState = seeded
        await this.commit()
        return
      }
      const state = {}
      for (const spec of tables) {
        const { rows } = await client.query(selectSql(spec))
        state[spec.key] = spec.map
          ? Object.fromEntries(rows.map(row => [row[spec.pk], fromRow(spec, row)]))
          : rows.map(row => fromRow(spec, row))
      }
      const { rows: meta } = await client.query('select key, value from public.app_meta')
      for (const { key, value } of meta) state[key] = value
      state.version ??= 1
      state.revision ??= 0
      state.datasetLabel ??= 'Campus data'
      const { rows: sessions } = await client.query('select id, account_id, issued_at::float8 as issued_at, expires_at::float8 as expires_at from public.sessions')
      this.#sessions = new Map(sessions.map(row => [row.id, { id: row.id, accountId: row.account_id, issuedAt: row.issued_at, expiresAt: row.expires_at }]))
      this.#committedSessions = new Map(this.#sessions)
      this.#state = state
      this.#committedState = state
    } finally {
      client.release()
    }
  }

  // Seed data comes from the backend's own seed module. The timetable is stored once
  // per room and expanded per date on read, so it never goes stale.
  #seedState() {
    const seed = createSeedState(this.#clock())
    const firstDate = seed.dateOptions[0]
    seed.timetable = seed.scheduleEntries.filter(entry => entry.date === firstDate)
      .map(({ date, ...entry }) => ({ id: `TT-${entry.roomId}-${entry.start}-${entry.end}`, ...entry }))
    seed.rooms = seed.rooms.map(room => ({ ...room, reservable: room.reservable ?? Number(room.floor) !== 4 }))
    for (const key of derivedKeys) delete seed[key]
    return seed
  }

  #materialize(state) {
    const today = manilaDate(this.#clock())
    const dateOptions = Array.from({ length: 7 }, (_, index) => addDays(today, index))
    const scheduleEntries = dateOptions.flatMap(date => state.timetable.map(({ id, ...entry }) => ({ ...entry, date })))
    return { ...state, dateOptions, scheduleEntries }
  }

  #queueFullInsert(state) {
    for (const spec of tables) {
      if (spec.map) for (const [id, record] of Object.entries(state[spec.key] || {})) this.#pending.push(upsertStatement(spec, record, id))
      else {
        const records = state[spec.key] || []
        for (const record of spec.order === 'desc' ? [...records].reverse() : records) this.#pending.push(upsertStatement(spec, record))
      }
    }
    for (const key of metaKeys) this.#pending.push(metaStatement(key, state[key]))
  }

  // Deletes run children-first, upserts parents-first, so foreign keys always hold.
  #queueDiff(previous, next) {
    const deletes = [], upserts = []
    for (const spec of tables) {
      const id = spec.stateId || spec.pk
      const before = spec.map ? new Map(Object.entries(previous[spec.key] || {})) : new Map((previous[spec.key] || []).map(record => [record[id], record]))
      const afterEntries = spec.map ? Object.entries(next[spec.key] || {}) : (next[spec.key] || []).map(record => [record[id], record])
      const after = new Map(afterEntries)
      for (const key of before.keys()) if (!after.has(key)) deletes.unshift(deleteStatement(spec, key))
      const ordered = spec.order === 'desc' ? [...afterEntries].reverse() : afterEntries
      for (const [key, record] of ordered) {
        if (!before.has(key) || !same(before.get(key), record)) upserts.push(upsertStatement(spec, record, spec.map ? key : undefined))
      }
    }
    for (const key of metaKeys) if (!same(previous[key], next[key])) upserts.push(metaStatement(key, next[key]))
    this.#pending.push(...deletes, ...upserts)
  }
}

function metaStatement(key, value) {
  return { text: 'insert into public.app_meta (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value', values: [key, JSON.stringify(value ?? null)] }
}

// Database errors become the API's normal error shape.
function translate(error) {
  if (error instanceof HttpError) return error
  const constraint = error?.constraint || ''
  if (error?.code === '23P01' && constraint === 'bookings_no_overlap') return new HttpError(409, 'BOOKING_CONFLICT', 'This room and time are no longer available')
  if (error?.code === '23P01' && constraint === 'memberships_one_officer_per_org') return new HttpError(409, 'POSITION_OCCUPIED', 'This organization already has someone in that position')
  if (error?.code === '23505' && constraint === 'accounts_email_key') return new HttpError(409, 'EMAIL_IN_USE', 'This email address is already used by another account')
  if (error?.code === '23505' && constraint === 'accounts_student_id_key') return new HttpError(409, 'ACCOUNT_EXISTS', 'An account already uses this student ID')
  if (error?.code === '23505') return new HttpError(409, 'DUPLICATE_RECORD', 'This record already exists')
  if (error?.code === 'P0001' && error?.hint === 'ROOM_UNAVAILABLE') return new HttpError(422, 'ROOM_UNAVAILABLE', 'This room is not available for reservation')
  if (error?.code === '23514' || error?.code === '23502') return new HttpError(422, 'VALIDATION_ERROR', 'The change was rejected because some values are invalid')
  console.error('[database] commit failed:', error?.code || '', error?.message || error)
  return new HttpError(503, 'DATABASE_UNAVAILABLE', 'The change could not be saved. Please try again')
}
