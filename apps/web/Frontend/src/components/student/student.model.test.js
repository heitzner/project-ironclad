import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../services/api.js'
import { createStudentService } from '../../services/student.service.js'
import { createStudentAction } from './studentAction.js'
import { filterArchive, pageOf, validArchive, validEvents, validProfile } from './student.model.js'

const record = (id, overrides = {}) => ({ id, title: `Archive ${id}`, organizer: 'Supplied organizer', courseSection: 'Supplied section', concludedDate: '2026-10-01', academicYear: '2026', semester: 'First', venue: { id: 'venue-1', label: 'Supplied room' }, ...overrides })

test('archive search, academic year, semester and exact venue ID apply together', () => {
  const records = [record('a'), record('b', { semester: 'Second' }), record('c', { academicYear: '2025' }), record('d', { venue: { id: 'venue-10', label: 'Other room' } })]
  assert.deepEqual(filterArchive(records, { search: '  supplied ORGANIZER ', academicYear: '2026', semester: 'First', venueId: 'venue-1' }).map(item => item.id), ['a'])
  assert.equal(filterArchive(records, { search: 'no match' }).length, 0)
})

test('archive/directory pagination renders one slice and recovers after results shrink', () => {
  const records = Array.from({ length: 13 }, (_, index) => record(String(index)))
  assert.deepEqual(pageOf(records, 2).items.map(item => item.id), ['6', '7', '8', '9', '10', '11'])
  assert.equal(pageOf(records, 3).items.length, 1)
  assert.equal(pageOf(records.slice(0, 2), 3).page, 1)
  assert.deepEqual(pageOf([], 9), { page: 1, totalPages: 1, items: [] })
})

test('Student read contracts reject malformed and duplicate records before rendering', () => {
  assert.equal(validEvents([null]), false)
  assert.equal(validEvents([{ id: 'e', title: 'Event' }, { id: 'e', title: 'Duplicate' }]), false)
  assert.equal(validEvents([{ id: 'e', title: 'Event', registrationOptions: { categories: {} } }]), false)
  assert.equal(validEvents([{ id: 'e', title: 'Event', registered: 'unknown' }]), false)
  assert.equal(validArchive({ records: [record('a')], filters: { venues: [null] } }), false)
  assert.equal(validArchive({ records: [record('a')] }), true)
  assert.equal(validProfile({ profile: {} }), false)
  assert.equal(validProfile({ profile: null }), true)
})

test('disconnected Student operations never fetch or imply a write/download', async () => {
  const service = createStudentService({ client: { request() { assert.fail('No endpoint was agreed') } } })
  for (const name of ['getEvents', 'getArchive', 'getProfile', 'register', 'updateProfile', 'exportArchive', 'getArchiveAsset']) {
    assert.equal(service.supports(name), false)
    await assert.rejects(service[name](), error => error.unavailable)
  }
})

test('Student adapters forward abort signals and require actual matching confirmations', async () => {
  const controller = new AbortController()
  const service = createStudentService({ operations: {
    getEvents: async (input, { signal }) => { assert.equal(signal, controller.signal); assert.deepEqual(input, {}); return [] },
    register: async () => ({ confirmed: true, id: 'registration-1', eventId: 'different-event' }),
    updateProfile: async () => ({ confirmed: true, id: 'different-user' }),
    getArchiveAsset: async () => ({ blob: new Blob([]), fileName: 'empty.txt' }),
  } })
  assert.deepEqual(await service.getEvents({}, { signal: controller.signal }), [])
  await assert.rejects(service.register({ eventId: 'event-1' }), { code: 'INVALID_RESPONSE' })
  await assert.rejects(service.updateProfile({ id: 'user-1' }), { code: 'INVALID_RESPONSE' })
  await assert.rejects(service.getArchiveAsset({ id: 'archive-1' }), { code: 'INVALID_RESPONSE' })
  const noop = createStudentService({ operations: { register: async () => undefined } })
  await assert.rejects(noop.register(), { code: 'INVALID_RESPONSE' })
})

test('confirmed Student outcomes and actual archive files pass through unchanged', async () => {
  const receipt = { confirmed: true, id: 'registration-1', eventId: 'event-1' }
  const file = { blob: new Blob(['actual supplied content']), fileName: 'actual.pdf' }
  const service = createStudentService({ operations: { register: async () => receipt, exportArchive: async () => file } })
  assert.equal(await service.register({ eventId: 'event-1' }), receipt)
  assert.equal(await service.exportArchive({ academicYear: '2026' }), file)
})

test('Student mutation guard freezes input and blocks repeated submits/reopened confirmed actions', async () => {
  const action = createStudentAction()
  let release
  let calls = 0
  const input = { roster: [{ name: 'Submitted name' }] }
  const pending = action.run(async snapshot => {
    calls += 1
    await new Promise(resolve => { release = resolve })
    assert.equal(snapshot.roster[0].name, 'Submitted name')
    return { confirmed: true, id: 'receipt' }
  }, input)
  input.roster[0].name = 'Edited after submission'
  assert.equal(action.getSnapshot().busy, true)
  assert.equal(await action.run(() => assert.fail('duplicate'), input), null)
  release()
  await pending
  assert.equal(action.getSnapshot().result.id, 'receipt')
  assert.equal(await action.run(() => assert.fail('reopened duplicate'), input), null)
  assert.equal(calls, 1)
})

test('uncertain mutation failures remain blocked; validation failures permit correction', async () => {
  const action = createStudentAction()
  await action.run(async () => { throw new ApiError('network', { code: 'NETWORK_ERROR' }) }, {})
  assert.equal(action.getSnapshot().blocked, true)
  assert.equal(await action.run(() => assert.fail('uncertain retry'), {}), null)
  const correctable = createStudentAction()
  await correctable.run(async () => { throw new ApiError('invalid fields', { status: 422 }) }, {})
  assert.equal(correctable.getSnapshot().blocked, false)
  assert.ok(await correctable.run(async () => ({ confirmed: true, id: 'corrected' }), {}))
})

test('scope disposal aborts writes and suppresses late results, including an old StrictMode lifetime', async () => {
  const action = createStudentAction()
  let release
  let signal
  const pending = action.run(async (_, options) => { signal = options.signal; return new Promise(resolve => { release = resolve }) }, {})
  action.dispose()
  assert.equal(signal.aborted, true)
  action.activate()
  release({ confirmed: true, id: 'stale' })
  assert.equal(await pending, null)
  assert.equal(action.getSnapshot().result, null)
})
