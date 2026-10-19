import test from 'node:test'
import assert from 'node:assert/strict'
import { addDays, bookingDates, clockParts, filterVenues, getFreeWindows, getSlotOptions, overlaps, roomView, updateDraft, validateRequest } from './booking.logic.js'
import { createMockRequestHandler, createMockSchedules, mockRooms } from './booking.fixtures.js'

const now = new Date('2026-10-19T10:15:00+08:00')
const date = '2026-10-19'
const schedules = createMockSchedules(now)
const room = id => mockRooms.find(item => item.id === id)
const valid = { roomId: '102', date, shift: 'all', start: 630, end: 780, purpose: 'Study group', requesterId: 'DEMO-STUDENT' }
const context = { rooms: mockRooms, schedules, now }

test('Manila calendar dates cross UTC midnight and month/year boundaries correctly', () => {
  assert.equal(clockParts(new Date('2026-12-31T16:01:00Z')).date, '2027-01-01')
  assert.equal(addDays('2026-12-30', 6), '2027-01-05')
  assert.deepEqual(bookingDates(now), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'])
})

test('free windows exclude current/past time, every scheduled block, and blocked rooms', () => {
  assert.deepEqual(getFreeWindows(room('102'), date, 'all', schedules, now), [{ start: 630, end: 810 }, { start: 990, end: 1020 }, { start: 1170, end: 1290 }])
  for (const id of ['203', '304']) assert.deepEqual(getFreeWindows(room(id), date, 'all', schedules, now), [])
  assert.deepEqual(getFreeWindows(room('102'), '2026-10-18', 'all', schedules, now), [])
  assert.deepEqual(getFreeWindows(room('102'), date, 'all', schedules, new Date('2026-10-19T22:00:00+08:00')), [])
})

test('explicit shift windows constrain requests, while all-day merges adjacent shifts', () => {
  assert.deepEqual(getFreeWindows(room('303'), date, 'morning', schedules, now), [{ start: 630, end: 810 }])
  assert.deepEqual(getFreeWindows(room('303'), date, 'evening', schedules, now), [{ start: 810, end: 1290 }])
  assert.deepEqual(getFreeWindows(room('303'), date, 'all', schedules, now), [{ start: 630, end: 1290 }])
  assert.equal(validateRequest({ ...valid, shift: 'morning', end: 900 }, context)?.field, 'slot')
  assert.equal(roomView(room('201'), date, 'evening', schedules, now).status, 'available')
})

test('catalog badges and details use the same occupancy and consistent room records', () => {
  const views = mockRooms.map(item => roomView(item, date, 'all', schedules, now))
  assert.equal(views.find(view => view.room.id === '101').status, 'occupied')
  assert.equal(views.find(view => view.room.id === '102').status, 'available')
  assert.equal(views.find(view => view.room.id === '104').status, 'reserved')
  assert.equal(views.find(view => view.room.id === '203').status, 'unavailable')
  assert.equal(room('103').name, 'Multimedia Studio')
  assert.equal(room('104').capacity, 60)
  assert.equal(views.length, 12)
})

test('availability labels distinguish a current vacancy from a future shift or date', () => {
  assert.equal(roomView(room('303'), date, 'all', schedules, now).label, 'Available Now')
  assert.equal(roomView(room('303'), date, 'evening', schedules, now).label, 'Free Window Available')
  assert.equal(roomView(room('303'), '2026-10-20', 'all', schedules, now).label, 'Free Window Available')
  const beforeOpening = new Date('2026-10-19T07:45:00+08:00')
  assert.equal(roomView(room('303'), date, 'all', schedules, beforeOpening).label, 'Free Window Available')
  const evening = new Date('2026-10-19T17:00:00+08:00')
  assert.equal(roomView(room('303'), date, 'evening', schedules, evening).label, 'Available Now')
})

test('card operating hours follow the supplied shift windows instead of all-day constants', () => {
  for (const [shift, expected] of [['all', { start: 480, end: 1290 }], ['morning', { start: 480, end: 810 }], ['evening', { start: 810, end: 1290 }]]) {
    assert.deepEqual(roomView(room('102'), date, shift, schedules, now).operatingWindow, expected)
  }
  const custom = { ...schedules, windows: [{ shift: 'morning', start: 540, end: 720 }] }
  assert.deepEqual(roomView(room('303'), date, 'morning', custom, now).operatingWindow, { start: 540, end: 720 })
  assert.equal(roomView(room('303'), date, 'evening', custom, now).operatingWindow, null)
})

test('trimmed case-insensitive search combines with floor and availability filters', () => {
  const views = mockRooms.map(item => roomView(item, date, 'all', schedules, now))
  assert.deepEqual(filterVenues(views, { floor: '1', search: '  ELECTRONICS ', statusFilter: 'available' }).map(view => view.room.id), ['102'])
  assert.equal(filterVenues(views, { floor: '2', search: 'electronics', statusFilter: 'all' }).length, 0)
  assert.equal(filterVenues(views, { floor: 'all', search: 'media annex', statusFilter: 'all' })[0].room.id, '103')
})

test('duration choices omit impossible presets and do not duplicate equal windows', () => {
  assert.deepEqual(getSlotOptions([{ start: 630, end: 810 }]).map(slot => [slot.start, slot.end]), [[630, 780], [630, 810]])
  assert.equal(getSlotOptions([{ start: 630, end: 780 }]).length, 1)
  assert.equal(getSlotOptions([{ start: 630, end: 660 }])[0].preset, false)
  assert.deepEqual(getSlotOptions([]), [])
})

test('search finds displayed Room labels while preserving combined filters and numeric search', () => {
  const views = mockRooms.map(item => roomView(item, date, 'all', schedules, now))
  const filters = { floor: 'all', statusFilter: 'all' }
  for (const search of ['Room 101', '101', '  ROOM   101  ']) {
    assert.deepEqual(filterVenues(views, { ...filters, search }).map(view => view.room.id), ['101'])
  }
  assert.equal(filterVenues(views, { ...filters, search: 'Room' }).length, 12)
  assert.equal(filterVenues(views, { ...filters, search: 'Room 999' }).length, 0)
  assert.equal(filterVenues(views, { ...filters, floor: '2', search: 'Room 101' }).length, 0)
  assert.equal(filterVenues(views, { ...filters, statusFilter: 'available', search: 'Room 101' }).length, 0)
})

test('validation rejects missing input, stale, reversed, overlapping and out-of-range intervals', () => {
  assert.equal(validateRequest(valid, context), null)
  for (const patch of [{ purpose: '  ' }, { start: undefined }, { start: 780, end: 630 }, { start: 600 }, { end: 840 }, { date: '2026-10-18' }, { date: '2026-10-26' }, { roomId: '203' }, { roomId: '304' }, { roomId: '401' }, { shift: 'unknown' }]) {
    assert.ok(validateRequest({ ...valid, ...patch }, context), JSON.stringify(patch))
  }
})

test('half-open intervals permit exact adjacency without permitting overlap', () => {
  assert.equal(overlaps({ start: 630, end: 810 }, { start: 810, end: 990 }), false)
  assert.equal(overlaps({ start: 630, end: 811 }, { start: 810, end: 990 }), true)
  assert.equal(validateRequest({ ...valid, end: 810 }, context), null)
})

test('invalid numeric intervals cannot bypass validation', () => {
  for (const patch of [
    { start: NaN }, { end: Infinity }, { start: 630.5 }, { end: 780.5 },
    { start: 780, end: 780 }, { start: -1 }, { end: 1441 },
    { start: '630' }, { end: null },
  ]) assert.equal(validateRequest({ ...valid, ...patch }, context)?.field, 'slot')
})

test('mock success returns a demo pending reference and rejects overlapping pending requests', async () => {
  const handler = createMockRequestHandler({ rooms: mockRooms, getSchedules: () => schedules, clock: () => now })
  const result = await handler(Object.freeze(valid))
  assert.match(result.id, /^DEMO-20261019-/)
  assert.equal(result.status, 'pending')
  await assert.rejects(handler(valid), { code: 'CONFLICT' })
  await assert.doesNotReject(handler({ ...valid, start: 780, end: 810 }))
})

test('explicit failure and conflict scenarios never return a confirmation result', async () => {
  for (const outcome of ['failure', 'conflict']) {
    const handler = createMockRequestHandler({ rooms: mockRooms, getSchedules: () => schedules, clock: () => now, outcome })
    await assert.rejects(handler(valid), error => outcome === 'conflict' ? error.code === 'CONFLICT' : /try again/.test(error.message))
  }
})

test('time passing between selection and submit invalidates the old slot', () => {
  const later = new Date('2026-10-19T10:31:00+08:00')
  assert.ok(validateRequest(valid, { ...context, now: later }))
  const futureDate = '2026-10-20'
  assert.equal(validateRequest({ ...valid, date: futureDate, start: 480, end: 630 }, { ...context, now: later }), null)
})

test('browse changes clear hidden selections and stale durations while preserving purpose', () => {
  const draft = { date, shift: 'all', floor: '1', search: '', statusFilter: 'all', roomId: '102', slotId: '630-780', purpose: 'Study group' }
  for (const patch of [{ roomId: '101' }, { date: '2026-10-20' }, { shift: 'morning' }]) assert.equal(updateDraft(draft, patch, context).slotId, '')
  for (const patch of [{ floor: '2' }, { search: 'multimedia' }, { statusFilter: 'occupied' }]) {
    const next = updateDraft(draft, patch, context)
    assert.equal(next.roomId, null)
    assert.equal(next.slotId, '')
    assert.equal(next.purpose, draft.purpose)
  }
  assert.equal(updateDraft(draft, { search: 'physics' }, context).slotId, draft.slotId)
  assert.equal(updateDraft(draft, {}, { ...context, now: new Date('2026-10-19T10:31:00+08:00') }).slotId, '')
  const nextDay = updateDraft(draft, {}, { ...context, now: new Date('2026-10-20T00:01:00+08:00') })
  assert.equal(nextDay.date, '2026-10-20')
  assert.equal(nextDay.slotId, '')
})
