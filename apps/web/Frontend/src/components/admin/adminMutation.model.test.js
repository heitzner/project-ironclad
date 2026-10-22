import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdminMutation, createMutationRegistry } from './adminMutation.model.js'

const outcome = { id: 'test-resource', status: 'approved', confirmed: true }
const valid = value => value?.id === outcome.id && value?.status === outcome.status

test('rapid and opposing writes share a synchronous guard and preserve submitted input', async () => {
  const registry = createMutationRegistry()
  let resolve, calls = 0, captured
  const callback = async (...args) => { calls += 1; captured = args; return new Promise(done => { resolve = done }) }
  const first = createAdminMutation({ registry, key: 'same-resource', callback })
  const other = createAdminMutation({ registry, key: 'same-resource', callback })
  const payload = { status: 'approved', reason: 'Submitted note' }
  const pending = first.run([outcome.id, payload], valid)
  payload.reason = 'Changed afterward'
  await other.run([outcome.id, { status: 'denied' }], valid)
  assert.equal(calls, 1)
  assert.equal(captured[1].reason, 'Submitted note')
  assert(captured[2].signal instanceof AbortSignal)
  resolve(outcome); await pending
  assert.equal(first.getSnapshot().outcome, outcome)
})

test('void, wrong-resource and unconfirmed results block retry even after reopening', async () => {
  for (const value of [undefined, { ...outcome, id: 'wrong' }, { id: outcome.id, status: outcome.status }]) {
    const registry = createMutationRegistry()
    let calls = 0
    const callback = async () => { calls += 1; return value }
    const action = createAdminMutation({ registry, key: 'save', callback })
    await action.run([outcome.id], valid)
    assert.equal(action.getSnapshot().outcome, null)
    assert.equal(action.getSnapshot().uncertain, true)
    action.cancel()
    await createAdminMutation({ registry, key: 'save', callback }).run([outcome.id], valid)
    assert.equal(calls, 1)
  }
})

test('an uncertain write can only be confirmed by a matching status result', async () => {
  let checked = 0
  const registry = createMutationRegistry()
  const action = createAdminMutation({ registry, key: 'save', callback: async () => { throw new Error('Connection lost') }, onCheckStatus: async context => { assert.deepEqual(context.args, [outcome.id]); return ++checked === 1 ? { ...outcome, status: 'pending' } : outcome } })
  await action.run([outcome.id], valid)
  await action.check(); assert.equal(action.getSnapshot().uncertain, true)
  await action.check(); assert.equal(action.getSnapshot().uncertain, false)
  assert.equal(action.getSnapshot().outcome, outcome)
})

test('a confirmed result survives refresh failure without repeating the mutation', async () => {
  let saves = 0, refreshes = 0
  const action = createAdminMutation({ key: 'save', callback: async () => { saves += 1; return outcome }, onRefresh: async () => { refreshes += 1; if (refreshes === 1) throw new Error('Refresh failed') } })
  await action.run([outcome.id], valid)
  assert.equal(action.getSnapshot().refreshError, true)
  assert.equal(action.getSnapshot().outcome, outcome)
  await action.run([outcome.id], valid)
  await action.check()
  assert.equal(saves, 1); assert.equal(refreshes, 2)
  assert.equal(action.getSnapshot().refreshError, false)
})

test('only an explicit matching not-applied status check permits a corrected retry', async () => {
  let saves = 0, checks = 0
  const action = createAdminMutation({ key: 'safe-retry', callback: async () => { if (++saves === 1) throw new Error('Uncertain write'); return outcome }, onCheckStatus: async () => ({ key: ++checks === 1 ? 'other-operation' : 'safe-retry', resolution: 'not-applied', retryAllowed: true }) })
  await action.run([outcome.id], valid)
  await action.check(); assert.equal(action.getSnapshot().uncertain, true)
  await action.check(); assert.equal(action.getSnapshot().uncertain, false)
  assert.match(action.getSnapshot().checkMessage, /no change was saved/)
  await action.run([outcome.id], valid)
  assert.equal(saves, 2); assert.equal(action.getSnapshot().outcome, outcome)
})

test('cancellation aborts the adapter, suppresses late success and blocks an uncertain repeat', async () => {
  let resolve, signal
  const action = createAdminMutation({ key: 'save', callback: async (_id, context) => { signal = context.signal; return new Promise(done => { resolve = done }) } })
  const pending = action.run([outcome.id], valid)
  action.cancel()
  assert.equal(signal.aborted, true)
  resolve(outcome); await pending
  assert.equal(action.getSnapshot().outcome, null)
  assert.equal(action.getSnapshot().uncertain, true)
})

test('validation rejection can be corrected while expired or denied sessions stay blocked', async () => {
  for (const status of [400, 401, 403, 422]) {
    let calls = 0
    const action = createAdminMutation({ key: 'save', callback: async () => { if (++calls === 1) throw Object.assign(new Error('Rejected'), { status }); return outcome } })
    await action.run([outcome.id], valid)
    assert.equal(action.getSnapshot().uncertain, false)
    await action.run([outcome.id], valid)
    assert.equal(calls, [401, 403].includes(status) ? 1 : 2)
  }
})
