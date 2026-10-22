import assert from 'node:assert/strict'
import test from 'node:test'
import { adminResource } from './adminResource.model.js'

test('disconnected, empty and supplied collection inputs remain distinct', () => {
  assert.equal(adminResource(undefined, ['rooms']).rooms, undefined)
  assert.deepEqual(adminResource({ rooms: [] }, ['rooms']).rooms, [])
  const rooms = [{ id: 'test-room', number: '101', floor: 1, capacity: 30 }]
  assert.equal(adminResource({ rooms }, ['rooms']).rooms, rooms)
})

test('malformed or duplicated records and invalid metrics fail closed', () => {
  for (const rooms of [null, {}, [null], [{ id: 'room', name: {} }], [{ id: 'room' }, { id: 'room' }], [{ id: 'room', capacity: -1 }]]) {
    const result = adminResource({ rooms }, ['rooms'])
    assert.equal(result.rooms, undefined); assert(result.error instanceof Error)
  }
  for (const summary of [[], { pendingRequests: -1 }, { events: '8' }]) {
    const result = adminResource({ summary }, [])
    assert.equal(result.summary, undefined); assert(result.error instanceof Error)
  }
})
