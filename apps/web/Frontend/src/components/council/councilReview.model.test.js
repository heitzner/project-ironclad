import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../services/api.js'
import { createCouncilService } from '../../services/council.service.js'
import { createReviewActions, formatApplicationDate, initialReviewCriteria, reviewCriteriaReducer, reviewErrorMessage, reviewOutcome, validateReviewData } from './councilReview.model.js'

// Synthetic service responses stay in tests; no app fixture or interactive mock is shipped.
const applicant = () => ({ id: 'test-applicant', name: 'Test applicant', program: { id: 'test-program', label: 'Test program' }, section: 'Test section' })
const row = (patch = {}) => ({ id: 'test-application', applicant: applicant(), submittedAt: '2026-10-19T18:00:00Z', timeZone: 'Asia/Manila',
  status: { id: 'test-awaiting', label: 'Awaiting review' }, version: 0, actions: { accept: { available: true }, reject: { available: true } }, ...patch })
const data = (patch = {}) => ({ applications: [row()], pendingTotal: 75, filters: { programs: [{ id: 'test-program', label: 'Test program' }], statuses: [{ id: 'test-awaiting', label: 'Awaiting review' }] },
  pagination: { page: 1, pageSize: 6, totalItems: 1, totalPages: 1 }, ...patch })
const result = (patch = {}) => ({ application: { id: 'test-application', status: 'service-status' }, ...patch })
const metadata = (scope = 'filtered') => ({ available: true, format: 'service-format', filename: 'service-export.csv', scope, scopeLabel: 'Service export scope' })
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const store = (operations, capabilities = {}) => createReviewActions({ service: createCouncilService({ operations }), userId: 'test-reviewer', canReview: true, canExport: true, ...capabilities })

test('combined review criteria reset paging and clear without losing server filter identifiers', () => {
  let state = { ...initialReviewCriteria, page: 4 }
  for (const [type, value] of [['query', '  name  '], ['program', 'server-program'], ['status', 'server-status']]) {
    state = reviewCriteriaReducer(state, { type, value }); assert.equal(state.page, 1); assert.equal(state[type], value)
  }
  assert.equal(reviewCriteriaReducer(state, { type: 'page', value: -1 }), state)
  assert.deepEqual(reviewCriteriaReducer(state, { type: 'clear' }), initialReviewCriteria)
})

test('review data preserves authoritative totals and formats submitted date in supplied timezone', () => {
  const source = data(); assert.equal(validateReviewData(source, initialReviewCriteria), source)
  assert.equal(source.pendingTotal, 75); assert.equal(source.applications.length, 1)
  assert.match(formatApplicationDate(row().submittedAt, 'Asia/Manila'), /20/)
  assert.match(formatApplicationDate(row().submittedAt, 'UTC'), /19/)
  for (const [date, zone] of [['bad', 'UTC'], ['2026-10-19', 'UTC'], [row().submittedAt, 'Invalid/Zone']]) assert.equal(formatApplicationDate(date, zone), null)
})

test('malformed rows, duplicate records, filters, counts, pagination and policies fail closed', () => {
  for (const source of [data({ pendingTotal: -1 }), data({ applications: [row(), row()] }), data({ applications: [row({ applicant: {} })] }),
    data({ applications: [row({ actions: {} })] }), data({ applications: [row({ status: 'pending' })] }), data({ applications: [row({ version: {} })] }),
    data({ filters: { programs: [{ id: 'p', label: 'P' }, { id: 'p', label: 'P' }], statuses: [] } }), data({ policy: { title: 'Unverified' } }),
    data({ pagination: { page: 1, pageSize: 6, totalItems: 1, totalPages: 25 } }), data({ pagination: { page: 2, pageSize: 6, totalItems: 1, totalPages: 1 } })]) assert.throws(() => validateReviewData(source), { code: 'INVALID_RESPONSE' })
  assert.throws(() => validateReviewData(data(), { page: 2 }))
  assert.doesNotThrow(() => validateReviewData(data({ applications: [], pendingTotal: 75, pagination: { page: 1, pageSize: 6, totalItems: 0, totalPages: 1 } })))
})

test('real review outcomes must match the submitted application and actual notification shape', () => {
  const outcome = reviewOutcome(result({ notification: { status: 'queued', channel: 'email', recipient: 'service recipient' } }), row())
  assert.equal(outcome.notification.status, 'queued'); assert.equal(outcome.application.status, 'service-status')
  assert.equal(reviewOutcome(result(), row()).notification, null)
  for (const response of [null, result({ application: { id: 'other', status: 'approved' } }), result({ application: { id: row().id, status: 'accepted', applicantId: 'other' } }), result({ notification: { sent: true } })]) assert.throws(() => reviewOutcome(response, row()))
})

test('only explicit identity, capability, supported operation and row availability permit decisions', async () => {
  for (const capabilities of [{ userId: '' }, { canReview: false }]) {
    const actions = store({ reviewApplication: async () => assert.fail('must not call') }, capabilities)
    assert(actions.decisionReason(row(), 'accept')); assert.equal(await actions.decide(row(), 'accept'), null)
  }
  const unavailable = store({}); assert.match(unavailable.decisionReason(row(), 'accept'), /not connected/)
  const actions = store({ reviewApplication: async () => assert.fail('not allowed') })
  const disabled = row({ actions: { accept: { available: false, reason: 'Closed by service' }, reject: { available: true } } })
  assert.equal(actions.decisionReason(disabled, 'accept'), 'Closed by service'); assert.equal(await actions.decide(disabled, 'accept'), null)
  assert.equal(await actions.decide(row(), 'grant-role'), null)
})

test('rapid decisions submit one immutable application/version snapshot and cannot close while saving', async () => {
  const delayed = deferred(); let calls = 0, payload
  const actions = store({ reviewApplication: async (input) => { calls++; payload = input; return delayed.promise } })
  const subject = row(); const pending = actions.decide(subject, 'reject', async () => data())
  assert.equal(actions.dismiss(), false); assert.equal(actions.getSnapshot().busy, true)
  for (let i = 0; i < 8; i++) assert.equal(await actions.decide(row(), 'accept'), null)
  assert.equal(calls, 1); assert(Object.isFrozen(payload)); assert.deepEqual(payload, { applicationId: row().id, decision: 'reject', version: 0 })
  subject.id = 'mutated'; subject.applicant.name = 'mutated'; delayed.resolve(result())
  assert.equal((await pending).applicantName, 'Test applicant'); assert.equal(actions.getSnapshot().busy, false)
})

test('a genuine response precedes refetch, survives missing refresh and blocks a second decision after closing', async () => {
  let refreshes = 0
  const actions = store({ reviewApplication: async () => result() })
  const receipt = await actions.decide(row(), 'accept', async () => { refreshes++; assert(actions.getSnapshot().outcome); return null })
  assert(receipt); assert.equal(refreshes, 1); assert.equal(actions.getSnapshot().refreshError, true)
  assert(actions.dismiss()); assert.match(actions.decisionReason(row(), 'reject'), /decision was received/)
  assert.equal(await actions.decide(row(), 'reject'), null)
})

test('generic/null failure keeps prior status and permits an explicit retry', async () => {
  let attempt = 0
  const actions = store({ reviewApplication: async () => { if (attempt++ === 0) throw null; return result() } })
  assert.equal(await actions.decide(row(), 'accept'), null); assert.match(reviewErrorMessage(actions.getSnapshot().error), /could not be saved/)
  assert.equal(actions.getSnapshot().outcome, null); assert.equal(actions.getSnapshot().requiresCheck.length, 0)
  assert(await actions.decide(row(), 'accept', async () => data()))
})

test('conflict, network, malformed and server failures require an authoritative check before retry', async () => {
  for (const error of [new ApiError('changed', { status: 409 }), new ApiError('changed', { status: 412 }), new ApiError('offline', { code: 'NETWORK_ERROR' }), new ApiError('invalid', { code: 'INVALID_RESPONSE' }), new ApiError('server', { status: 500 }), new DOMException('Timeout', 'AbortError')]) {
    let calls = 0
    const actions = store({ reviewApplication: async () => { calls++; if (calls === 1) throw error; return result() } })
    await actions.decide(row(), 'accept'); assert.match(actions.decisionReason(row(), 'accept'), /Reload the latest status/)
    assert.equal(await actions.decide(row(), 'accept'), null); assert.equal(calls, 1)
    assert.equal(await actions.checkStatus(async () => null), null); assert(actions.getSnapshot().requiresCheck.includes(row().id))
    await actions.checkStatus(async () => data()); assert.equal(actions.getSnapshot().requiresCheck.length, 0)
    assert.match(actions.getSnapshot().checkMessage, /Awaiting review/); assert.equal(calls, 1)
    assert(await actions.decide(row(), 'accept', async () => data()))
  }
})

test('uncertain row absent from a refreshed filter stays blocked without inventing a terminal status', async () => {
  const actions = store({ reviewApplication: async () => { throw new ApiError('offline', { code: 'NETWORK_ERROR' }) } })
  await actions.decide(row(), 'reject')
  await actions.checkStatus(async () => data({ applications: [], pagination: { page: 1, pageSize: 6, totalItems: 0, totalPages: 1 } }))
  assert(actions.getSnapshot().requiresCheck.includes(row().id)); assert.match(actions.getSnapshot().checkMessage, /not in the latest results/)
  assert.equal(actions.getSnapshot().outcome, null)
  await actions.checkStatus(async () => data(), row().id); assert.equal(actions.getSnapshot().requiresCheck.length, 0)
})

test('authorization failure disables further actions in the same authenticated scope', async () => {
  for (const status of [401, 403]) {
    const actions = store({ reviewApplication: async () => { throw new ApiError('denied', { status }) } })
    await actions.decide(row(), 'accept'); assert(actions.decisionReason(row(), 'reject'))
    assert.equal(await actions.checkStatus(async () => assert.fail('cannot refetch')), null)
  }
})

test('unmount aborts and suppresses late successes and failures even if an adapter ignores cancellation', async () => {
  for (const failure of [false, true]) {
    const delayed = deferred(); let signal, refreshes = 0
    const actions = store({ reviewApplication: async (_, context) => { signal = context.signal; return delayed.promise } })
    const saving = actions.decide(row(), 'accept', async () => { refreshes++; return data() })
    actions.cancel(); assert(signal.aborted)
    if (failure) delayed.reject(new Error('late')); else delayed.resolve(result())
    assert.equal(await saving, null); assert.equal(refreshes, 0); assert.equal(actions.getSnapshot().outcome, null); assert.equal(actions.getSnapshot().error, null)
  }
})

test('missing version is forwarded without manufacturing a concurrency token', async () => {
  let payload
  const actions = store({ reviewApplication: async (input) => { payload = input; return result() } })
  await actions.decide(row({ version: undefined }), 'accept', async () => data())
  assert.deepEqual(payload, { applicationId: row().id, decision: 'accept' })
})

test('export requires actual capability, metadata and operation; unsafe names and empty blobs are rejected', async () => {
  const actions = store({}); assert.match(actions.exportReason(metadata()), /not connected/)
  const noCapability = store({ exportApplications: async () => assert.fail('cannot export') }, { canExport: false })
  assert.equal(await noCapability.export(initialReviewCriteria, metadata()), null)
  const empty = store({ exportApplications: async () => new Blob([]) })
  assert.equal(await empty.export(initialReviewCriteria, metadata()), null); assert.equal(empty.getSnapshot().download, null)
  for (const filename of ['../fake.csv', 'folder\\fake.csv', '.', 'bad\nname.csv']) assert.throws(() => validateReviewData(data({ export: { ...metadata(), filename } })))
})

test('export forwards exact supported scope and exposes only an actual returned blob', async () => {
  for (const scope of ['all', 'filtered', 'page']) {
    let payload; const blob = new Blob(['service returned bytes'], { type: 'text/csv' })
    const actions = store({ exportApplications: async (input) => { payload = input; return blob } })
    const criteria = { query: '  needle  ', program: 'p', status: 's', page: 3 }
    const response = await actions.export(criteria, metadata(scope)); assert.equal(response.blob, blob); assert(Object.isFrozen(payload))
    assert.deepEqual(payload, { format: 'service-format', scope, ...(scope === 'all' ? {} : { query: 'needle', program: 'p', status: 's' }), ...(scope === 'page' ? { page: 3 } : {}) })
    assert.equal(await actions.export(criteria, metadata(scope)), null); assert(actions.dismiss())
  }
})

test('delayed export blocks decisions and discards cancelled downloads', async () => {
  const delayed = deferred(); let signal
  const actions = store({ exportApplications: async (_, context) => { signal = context.signal; return delayed.promise }, reviewApplication: async () => assert.fail('busy') })
  const exporting = actions.export(initialReviewCriteria, metadata())
  assert.equal(await actions.decide(row(), 'accept'), null); assert.equal(actions.dismiss(), false)
  actions.cancel(); assert(signal.aborted); delayed.resolve(new Blob(['late']))
  assert.equal(await exporting, null); assert.equal(actions.getSnapshot().download, null)
})
