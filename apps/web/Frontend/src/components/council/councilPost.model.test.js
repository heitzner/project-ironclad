import assert from 'node:assert/strict'
import test from 'node:test'
import { createPostDraft, normalizePostConstraints, postErrorMessage, validatePost } from './councilPost.model.js'
import { createCouncilService } from '../../services/council.service.js'
import { ApiError } from '../../services/api.js'

const deferred = () => {
  let resolve, reject
  const promise = new Promise((pass, fail) => { resolve = pass; reject = fail })
  return { promise, resolve, reject }
}
const options = (createPost, patch = {}) => ({ userId: 'test-author', councilId: 'test-council', canCreatePost: true, service: createCouncilService({ operations: { createPost } }), ...patch })
const fill = (draft) => { draft.edit('header', '  Test header  '); draft.edit('description', ' Test description\nwith a second line. ') }

test('posting validates required trimmed text and only supplied length limits', () => {
  assert.deepEqual(validatePost({ header: ' \n', description: '' }), { header: 'Enter a header.', description: 'Enter a description.' })
  assert.deepEqual(validatePost({ header: 'x'.repeat(10000), description: 'x'.repeat(20000) }), {})
  const constraints = { header: { minLength: 3, maxLength: 5 }, description: { maxLength: 4 } }
  assert.deepEqual(validatePost({ header: '  abcde  ', description: '  test  ' }, constraints), {})
  assert.match(validatePost({ header: 'ab', description: 'tests' }, constraints).header, /at least 3/)
  assert.match(validatePost({ header: 'abcdef', description: 'tests' }, constraints).description, /no more than 4/)
  for (const invalid of [null, [], { header: [] }, { header: { maxLength: 0 } }, { description: { minLength: '4' } }, { header: { minLength: 5, maxLength: 3 } }]) {
    assert.throws(() => normalizePostConstraints(invalid), { code: 'INVALID_CONSTRAINTS' })
  }
})

test('validation failure never submits; cancel keeps drafts and clears field errors', async () => {
  let calls = 0
  const draft = createPostDraft(options(() => { calls += 1 }))
  await draft.submit()
  assert.equal(calls, 0)
  assert.equal(Object.keys(draft.getSnapshot().errors).length, 2)
  draft.edit('header', 'Test header')
  assert.equal(draft.getSnapshot().errors.header, undefined)
  assert.equal(draft.dismiss(), true)
  assert.equal(draft.getSnapshot().values.header, 'Test header')
  assert.deepEqual(draft.getSnapshot().errors, {})
})

test('disconnected, signed-out, denied and invalid requirements never call a mutation', async () => {
  let calls = 0
  const createPost = () => { calls += 1 }
  for (const patch of [
    { service: createCouncilService() }, { userId: null }, { councilId: '' }, { canCreatePost: false }, { canCreatePost: 'true' },
    { constraints: { header: { maxLength: -1 } } }, { service: { createPost } },
  ]) {
    const draft = createPostDraft(options(createPost, patch))
    fill(draft)
    assert(draft.unavailableReason())
    assert.equal(await draft.submit(), null)
    assert.equal(draft.getSnapshot().outcome, null)
  }
  assert.equal(calls, 0)
})

test('one immutable payload is sent while busy; repeated submit/edit/close are guarded', async () => {
  const request = deferred(), calls = []
  const draft = createPostDraft(options((payload, context) => { calls.push({ payload, context }); return request.promise }))
  fill(draft)
  const pending = draft.submit()
  for (let index = 0; index < 8; index += 1) await draft.submit()
  draft.edit('header', 'Overwrite while busy')
  assert.equal(draft.dismiss(), false)
  assert.equal(draft.getSnapshot().busy, true)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].payload, { councilId: 'test-council', header: 'Test header', description: 'Test description\nwith a second line.' })
  assert(Object.isFrozen(calls[0].payload))
  assert.equal(calls[0].context.signal.aborted, false)
  const outcome = { id: 'test-created-id', status: 'pending' }
  request.resolve(outcome)
  assert.equal(await pending, outcome)
  assert.equal(draft.getSnapshot().outcome, outcome)
  assert.deepEqual(draft.getSnapshot().values, { header: '', description: '' })
  assert.equal(draft.getSnapshot().busy, false)
  await draft.submit()
  assert.equal(calls.length, 1)
  draft.dismiss()
  assert.equal(draft.getSnapshot().outcome, null)
  fill(draft)
  assert.equal(draft.getSnapshot().values.header, '  Test header  ')
})

test('generic and null failures preserve exact drafts and support a real retry', async () => {
  for (const cause of [new Error('Test failure'), null, undefined]) {
    let calls = 0
    const draft = createPostDraft(options(async () => { calls += 1; if (calls === 1) throw cause; return { id: 'test-retry-id', status: 'pending' } }))
    fill(draft)
    const values = draft.getSnapshot().values
    await draft.submit()
    assert.deepEqual(draft.getSnapshot().values, values)
    assert.equal(draft.getSnapshot().outcome, null)
    assert.equal(draft.getSnapshot().busy, false)
    assert(draft.getSnapshot().error instanceof Error)
    assert.match((await draft.submit()).id, /test-retry/)
    assert.equal(calls, 2)
  }
})

test('invalid/unconfirmed responses never clear drafts or produce success', async () => {
  for (const result of [undefined, null, {}, { id: 'test-id' }, { id: 'test-id', status: ' ' }]) {
    const draft = createPostDraft(options(async () => result))
    fill(draft)
    const values = draft.getSnapshot().values
    assert.equal(await draft.submit(), null)
    assert.equal(draft.getSnapshot().error.code, 'INVALID_RESPONSE')
    assert.deepEqual(draft.getSnapshot().values, values)
    assert.equal(draft.getSnapshot().outcome, null)
    assert.match(postErrorMessage(draft.getSnapshot().error), /could not confirm/)
  }
})

test('auth denial is explicit and blocks further attempts until a new auth scope', async () => {
  for (const status of [401, 403]) {
    let calls = 0
    const draft = createPostDraft(options(async () => { calls += 1; throw new ApiError('Denied', { status }) }))
    fill(draft)
    await draft.submit()
    assert.match(draft.unavailableReason(), status === 401 ? /Sign in again/ : /no longer available/)
    draft.edit('header', 'Another header')
    await draft.submit()
    assert.equal(calls, 1)
    assert.equal(draft.getSnapshot().outcome, null)
    assert.equal(draft.getSnapshot().values.header, 'Another header')
  }
})

test('conflict/network/unavailable messages preserve uncertainty and recovery context', async () => {
  for (const [error, message] of [
    [new ApiError('Conflict', { status: 409 }), /conflicting post/],
    [new ApiError('Precondition', { status: 412 }), /conflicting post/],
    [new ApiError('Network', { code: 'NETWORK_ERROR' }), /could not confirm/],
    [new ApiError('Not connected', { code: 'CONNECTION_UNAVAILABLE' }), /not connected/],
  ]) {
    const draft = createPostDraft(options(async () => { throw error }))
    fill(draft)
    await draft.submit()
    assert.match(postErrorMessage(draft.getSnapshot().error), message)
    assert.match(draft.getSnapshot().values.header, /Test header/)
  }
})

test('unmount/scope cancellation aborts and suppresses late success and late failure', async () => {
  for (const lateFailure of [false, true]) {
    const request = deferred()
    let signal
    const draft = createPostDraft(options((payload, context) => { signal = context.signal; return request.promise }))
    fill(draft)
    const pending = draft.submit()
    const before = draft.getSnapshot()
    draft.cancel()
    assert.equal(signal.aborted, true)
    if (lateFailure) request.reject(new Error('Late failure'))
    else request.resolve({ id: 'test-late-id', status: 'pending' })
    assert.equal(await pending, null)
    assert.equal(draft.getSnapshot(), before)
  }
})

test('post-create refresh failure never converts a valid create into an editable retry', async () => {
  const outcome = { id: 'test-created-id', status: 'pending' }
  const draft = createPostDraft(options(async () => outcome))
  fill(draft)
  await draft.submit()
  draft.reportRefreshFailure(outcome)
  assert.equal(draft.getSnapshot().outcome, outcome)
  assert.equal(draft.getSnapshot().refreshError, true)
  assert.equal(await draft.submit(), null)
  draft.dismiss()
  draft.reportRefreshFailure(outcome)
  assert.equal(draft.getSnapshot().refreshError, false)
})
