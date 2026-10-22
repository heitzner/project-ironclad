import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../services/api.js'
import { createAsyncResource } from './asyncResource.js'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('reads publish loading, error and successful retry without inventing empty data', async () => {
  let failing = true
  const resource = createAsyncResource(async () => {
    if (failing) throw new Error('Test failure')
    return { campaigns: [] }
  })
  assert.equal(resource.getSnapshot().loading, true)
  await resource.refetch()
  assert.equal(resource.getSnapshot().status, 'error')
  assert.equal(resource.getSnapshot().data, null)
  failing = false
  await resource.refetch()
  assert.equal(resource.getSnapshot().status, 'success')
  assert.deepEqual(resource.getSnapshot().data, { campaigns: [] })
})

test('overlapping reads ignore old success even if the adapter ignores abort', async () => {
  const first = deferred(), second = deferred()
  const signals = []
  const resource = createAsyncResource(({ signal }) => {
    signals.push(signal)
    return signals.length === 1 ? first.promise : second.promise
  })
  const old = resource.refetch()
  const latest = resource.refetch()
  assert.equal(signals[0].aborted, true)
  second.resolve({ current: true })
  await latest
  first.resolve({ current: false })
  await old
  assert.deepEqual(resource.getSnapshot().data, { current: true })
})

test('late errors cannot overwrite a newer successful response', async () => {
  const oldRequest = deferred()
  let calls = 0
  const resource = createAsyncResource(() => ++calls === 1 ? oldRequest.promise : Promise.resolve('latest'))
  const old = resource.refetch()
  await resource.refetch()
  oldRequest.reject(null)
  await old
  assert.equal(resource.getSnapshot().data, 'latest')
  assert.equal(resource.getSnapshot().error, null)
})

test('cancelled identity/unmount reads cannot publish and can restart for Strict Mode', async () => {
  const pending = deferred()
  let signal
  const resource = createAsyncResource((options) => { signal = options.signal; return pending.promise })
  let notifications = 0
  const unsubscribe = resource.subscribe(() => { notifications += 1 })
  const request = resource.refetch()
  resource.cancel()
  assert.equal(signal.aborted, true)
  pending.resolve('stale identity')
  await request
  assert.equal(resource.getSnapshot().data, null)
  assert.equal(notifications, 1)
  unsubscribe()
  await resource.refetch()
  assert.equal(resource.getSnapshot().data, 'stale identity')
  assert.equal(notifications, 1)
})

test('disabled reads never call the adapter', async () => {
  const resource = createAsyncResource(() => assert.fail('disabled read'), { enabled: false })
  assert.equal(resource.getSnapshot().status, 'idle')
  await resource.refetch()
  assert.equal(resource.getSnapshot().loading, false)
})

test('same-scope refresh retains supplied data while reporting loading and failure', async () => {
  const refresh = deferred()
  const data = { id: 'test-form', questions: [] }
  let calls = 0
  const resource = createAsyncResource(() => ++calls === 1 ? Promise.resolve(data) : refresh.promise)
  await resource.refetch()
  const request = resource.refetch()
  assert.equal(resource.getSnapshot().data, data)
  assert.equal(resource.getSnapshot().loading, true)
  refresh.reject(new Error('Refresh failed'))
  await request
  assert.equal(resource.getSnapshot().data, data)
  assert.equal(resource.getSnapshot().status, 'error')
  assert.equal(resource.getSnapshot().loading, false)
})

test('unavailable and null rejections produce distinct actionable errors', async () => {
  const unavailable = createAsyncResource(async () => { throw new ApiError('Not connected', { code: 'OPERATION_UNAVAILABLE' }) })
  await unavailable.refetch()
  assert.equal(unavailable.getSnapshot().status, 'unavailable')
  const failed = createAsyncResource(async () => { throw null })
  await failed.refetch()
  assert.equal(failed.getSnapshot().status, 'error')
  assert.match(failed.getSnapshot().error.message, /retry/i)
})
