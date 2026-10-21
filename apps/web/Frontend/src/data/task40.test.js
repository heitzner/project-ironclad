import test from 'node:test'
import assert from 'node:assert/strict'
import { createFrontendStore, systemStorageKey } from './frontend-system.js'
import { canManageMembers, effectiveUser } from './organization.js'
import { customTimeOptions, getSlotOptions, roomView, timeRange, updateDraft } from './booking-selection.js'
import { validateRequest } from '../features/student-booking/booking.logic.js'
import { isCalendarDate } from './time-options.js'

const now = new Date('2026-10-21T06:00:00+08:00')
const admin = { id: 'test-admin', role: 'admin', name: 'Admin', course: 'BSCS' }
const president = { id: 'test-council', role: 'council', name: 'Council', course: 'BSCS' }
const student = { id: 'student', role: 'student', name: 'Student', course: 'BSCS' }
function setup() {
  const records = new Map()
  const storage = { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value) }
  let sequence = 0
  const options = { storage, clock: () => now, id: () => String(++sequence) }
  return { store: createFrontendStore(options), options, records }
}
const booking = (start, end, date = '2026-10-22') => ({ roomId: '404', requesterId: student.id, purpose: 'Study', date, shift: 'all', start, end })

test('catalog filters retain selection and chosen interval; explicit deselection clears it', () => {
  const { store } = setup()
  const previous = { date: '2026-10-22', shift: 'all', floor: '1', search: '', statusFilter: 'all', roomId: '101', purpose: 'Study', slotId: 'custom', from: '690', to: '720' }
  const context = { rooms: store.getSnapshot().rooms, schedules: store.schedules(), now }
  const filtered = updateDraft(previous, { floor: '2', search: 'different room', statusFilter: 'occupied' }, context)
  assert.equal(filtered.roomId, '101'); assert.equal(filtered.from, '690'); assert.equal(filtered.to, '720')
  const deselected = updateDraft(filtered, { roomId: null }, context)
  assert.equal(deselected.slotId, ''); assert.equal(deselected.from, ''); assert.equal(deselected.to, '')
})

test('From/To choices cannot bridge an occupied period and offer later free windows', () => {
  const windows = [{ start: 480, end: 600 }, { start: 720, end: 1260 }]
  const choices = customTimeOptions(windows, '570')
  assert.deepEqual(choices.ends, [585, 600])
  assert(!choices.starts.includes(600)); assert(!choices.starts.includes(675)); assert(choices.starts.includes(720))
  assert.deepEqual(customTimeOptions(windows, '660').ends, [])
  assert(getSlotOptions(windows).some(slot => slot.start === 720))
})

test('interval closure prevents overlaps and permits exact adjacency across reloads', () => {
  const { store, options } = setup()
  store.scheduleClosure(admin, { roomId: '404', mode: 'interval', date: '2026-10-22', start: 600, end: 720, reason: 'Maintenance' })
  const reloaded = createFrontendStore(options)
  assert.throws(() => reloaded.book(student, booking(585, 615)), /available/)
  assert.throws(() => reloaded.book(student, booking(660, 750)), /available/)
  assert.equal(reloaded.book(student, booking(540, 600)).status, 'pending')
  assert.equal(reloaded.book(student, booking(720, 780)).status, 'pending')
})

test('whole-week closure covers seven dates and an Admin can reopen immediately', () => {
  const { store } = setup()
  store.scheduleClosure(admin, { roomId: '404', mode: 'week', date: '2026-10-21', reason: 'Department use' })
  const closure = store.getSnapshot().closures[0]
  assert.equal(closure.endDate, '2026-10-27'); assert.equal(closure.start, 0); assert.equal(closure.end, 1440)
  assert.throws(() => store.book(student, booking(600, 660)), /available/)
  store.reopenRoom(admin, '404')
  assert.equal(store.getSnapshot().closures.length, 0)
  assert.equal(store.book(student, booking(600, 660)).status, 'pending')
})

test('closure validation rejects malformed dates, reversed intervals, duplicates, and non-Admin writes', () => {
  const { store } = setup()
  const input = { roomId: '404', mode: 'day', date: '2026-10-22', reason: 'Maintenance' }
  assert.throws(() => store.scheduleClosure(student, input), /Administrator/)
  assert.throws(() => store.scheduleClosure(admin, { ...input, date: '2026-02-31' }), /date/)
  assert.throws(() => store.scheduleClosure(admin, { ...input, mode: 'interval', start: 720, end: 600 }), /end/)
  store.scheduleClosure(admin, input)
  assert.throws(() => store.scheduleClosure(admin, input), /overlaps/)
})

test('presidential nomination leaves authority unchanged until the nominated member accepts', () => {
  const { store, options } = setup()
  store.assignPosition(president, student, 'Vice President')
  const nomination = store.nominatePresident(president, student.id)
  assert.equal(store.user(president).position, 'President')
  assert.equal(store.user(student).position, 'Vice President')
  assert.throws(() => store.respondHandover(admin, nomination.id, 'accept'), /Only the nominated/)
  const successorSession = createFrontendStore(options)
  successorSession.respondHandover(student, nomination.id, 'accept')
  store.refresh()
  assert.equal(store.user(president).position, 'Member')
  assert.equal(store.user(student).position, 'President')
  assert.equal(canManageMembers(store.user(president)), false)
  assert.equal(canManageMembers(store.user(student)), true)
  assert.throws(() => store.respondHandover(student, nomination.id, 'accept'), /no longer pending/)
})

test('ACES uses the same nomination/acceptance flow and lower Admins retain their Admin role', () => {
  const { store } = setup()
  store.assignPosition(admin, student, 'Secretary')
  const nominee = store.user(student)
  assert.equal(nominee.role, 'admin')
  const nomination = store.nominatePresident(admin, student.id)
  store.respondHandover(student, nomination.id, 'accept')
  assert.equal(store.user(admin).role, 'admin')
  assert.equal(store.user(admin).position, 'Member')
  assert.equal(canManageMembers(store.user(admin)), false)
})

test('declined/cancelled nominations keep the current President; self/cross-council/duplicate handovers fail', () => {
  const { store } = setup()
  store.assignPosition(president, student, 'Member')
  assert.throws(() => store.nominatePresident(president, president.id), /another/)
  assert.throws(() => store.assignPosition(president, { ...student, id: 'foreign', course: 'BSIT' }, 'Member'), /own council/)
  const first = store.nominatePresident(president, student.id)
  assert.throws(() => store.nominatePresident(president, student.id), /already awaiting/)
  store.respondHandover(student, first.id, 'decline')
  assert.equal(store.user(president).position, 'President')
  const next = store.nominatePresident(president, student.id)
  store.respondHandover(president, next.id, 'cancel')
  assert.equal(store.user(president).position, 'President')
})

test('only the top three positions manage members, and lower managers cannot appoint executives', () => {
  const { store } = setup()
  store.assignPosition(president, student, 'Secretary')
  const another = { ...student, id: 'another', name: 'Another member' }
  assert(canManageMembers(store.user(student)))
  assert.throws(() => store.assignPosition(student, another, 'Vice President'), /Only the President/)
  assert.throws(() => store.assignPosition(president, another, 'Secretary'), /already has/)
  store.assignPosition(student, another, 'Treasurer')
  assert(!canManageMembers(store.user(another)))
  assert.throws(() => store.assignPosition(another, student, 'Member'), /Only the President/)
})

test('profile saves remain repeatable and corrections never replace official identity', () => {
  const { store } = setup()
  const profile = { id: student.id, email: 'student@campus.example', displayName: 'Preferred name', avatarUrl: 'first.png', emailVerificationReceipt: 'verified-fixture' }
  store.saveProfile(student, profile)
  store.saveProfile(student, { ...profile, avatarUrl: 'second.png' })
  assert.equal(store.getSnapshot().profiles[student.id].version, 2)
  store.saveProfile(student, { id: student.id, correction: { field: 'Official full name', value: 'Corrected official name', reason: 'Correction request' } })
  assert.equal(store.getSnapshot().profiles[student.id].version, 3)
  assert.equal(effectiveUser(student, store.getSnapshot()).name, 'Preferred name')
  assert.equal(store.getSnapshot().profiles[student.id].corrections[0].status, 'pending')
  assert.throws(() => store.saveProfile(student, { ...profile, email: '' }), /school email/)
})

test('existing version-one data migrates in memory without losing its prior records', () => {
  const { store, records, options } = setup()
  const old = structuredClone(store.getSnapshot()); delete old.members; delete old.closures; delete old.handovers; delete old.organizationLog
  old.posts[0].title = 'Preserved post'
  records.set(systemStorageKey, JSON.stringify(old))
  const migrated = createFrontendStore(options)
  assert.equal(migrated.getSnapshot().posts[0].title, 'Preserved post')
  assert.equal(migrated.user(president).position, 'President')
  assert.equal(migrated.getSnapshot().closures.length, 0)
})

test('final booking validation still rejects a hand-crafted interval crossing a closure', () => {
  const { store } = setup()
  store.scheduleClosure(admin, { roomId: '404', mode: 'interval', date: '2026-10-22', start: 600, end: 720, reason: 'Maintenance' })
  assert.equal(validateRequest(booking(540, 750), { rooms: store.getSnapshot().rooms, schedules: store.schedules(), now }).field, 'slot')
})

test('whole-day closures show closed status and midnight rather than occupied/noon', () => {
  const { store } = setup()
  store.scheduleClosure(admin, { roomId: '404', mode: 'day', date: '2026-10-21', reason: 'Maintenance' })
  const view = roomView(store.getSnapshot().rooms.find(r => r.id === '404'), '2026-10-21', 'all', store.schedules(), now)
  assert.equal(view.status, 'unavailable'); assert.equal(view.label, 'Scheduled closure')
  assert.equal(timeRange(0, 1440), '12:00 AM – 12:00 AM (next day)')
})

test('a removed member returns to Student and cannot use old management authority', () => {
  const { store } = setup()
  store.assignPosition(admin, student, 'Secretary')
  store.assignPosition(admin, student, 'Student')
  assert.equal(store.user(student).role, 'student')
  assert.equal(canManageMembers(store.user(student)), false)
  assert.throws(() => store.assignPosition(student, { ...student, id: 'other' }, 'Member'), /Only the President/)
})

test('calendar inputs reject normalized impossible dates and accept a real leap day', () => {
  assert.equal(isCalendarDate('2027-02-31'), false)
  assert.equal(isCalendarDate('2027-02-29'), false)
  assert.equal(isCalendarDate('2028-02-29'), true)
  assert.equal(isCalendarDate('2027-13-01'), false)
})

test('inactive accounts never receive member-management visibility', () => {
  assert.equal(canManageMembers({ ...admin, position: 'President', disabled: true }), false)
  assert.equal(canManageMembers({ ...president, position: 'Secretary', status: 'suspended' }), false)
})
