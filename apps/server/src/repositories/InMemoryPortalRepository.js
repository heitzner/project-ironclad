import { randomUUID } from 'node:crypto'
import { createSeedState } from '../data/seed.js'

const clone = value => structuredClone(value)

export class InMemoryPortalRepository {
  #state
  #sessions = new Map()
  #challenges = new Map()
  #receipts = new Map()

  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock
    this.reset()
  }

  reset() {
    this.#state = createSeedState(this.clock())
    this.#sessions.clear()
    this.#challenges.clear()
    this.#receipts.clear()
    return this.readState()
  }

  readState() { return clone(this.#state) }
  transaction(change) {
    const next = clone(this.#state)
    const result = change(next)
    next.revision += 1
    this.#state = next
    return clone(result)
  }
  findAccountById(id) { return clone(this.#state.accounts.find(account => account.id === id) || null) }
  findAccountByStudentId(studentId) { return clone(this.#state.accounts.find(account => account.studentId.toUpperCase() === String(studentId).trim().toUpperCase()) || null) }
  findAccountByEmail(email) { return clone(this.#state.accounts.find(account => account.email.toLowerCase() === String(email).trim().toLowerCase()) || null) }
  listAccounts() { return clone(this.#state.accounts) }
  createAccount(account) { return this.transaction(state => { state.accounts.push(account); state.members[account.id] = { role: 'student', position: '', scope: '', course: account.course }; return account }) }
  updateAccount(id, patch) { return this.transaction(state => { const account = state.accounts.find(item => item.id === id); if (!account) return null; Object.assign(account, patch); return account }) }
  updateMembership(id, membership) { return this.transaction(state => { state.members[id] = { ...(state.members[id] || {}), ...membership }; return state.members[id] }) }
  createSession(session) { this.#sessions.set(session.id, clone(session)); return clone(session) }
  findSession(id) { return clone(this.#sessions.get(id) || null) }
  deleteSession(id) { return this.#sessions.delete(id) }
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
}
