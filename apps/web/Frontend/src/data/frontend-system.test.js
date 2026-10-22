import test from 'node:test'
import assert from 'node:assert/strict'
import { createFrontendStore, initialSystem, systemStorageKey } from './frontend-system.js'

const student = { id: 'student', name: 'Student', studentId: '20241200-C', course: 'BSCS', role: 'student' }
const council = { id: 'council', name: 'Council', studentId: '20240002-C', course: 'BSCS', role: 'council' }
const admin = { id: 'admin', name: 'Admin', studentId: '20240001-A', course: 'BSCS', role: 'admin' }
const now = new Date('2026-10-20T09:00:00+08:00')
function setup() {
  const values = new Map()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  let sequence = 0
  const options = { storage, clock: () => now, id: () => String(++sequence) }
  return { store: createFrontendStore(options), options, storage }
}
const request = (user, roomId = '401', start = 480, end = 630) => ({ requesterId: user.id, roomId, date: '2026-10-21', shift: 'all', start, end, purpose: 'Study meeting' })
const individual = { contact: 'student@example.test', category: 'Singles' }
const application = { contact: 'student@example.test', answers: ['Organize events.', 'Programming and planning.'] }
const post = { kind: 'event', title: 'New event', description: 'Event registration.', venue: 'Room 401', startsAt: '2026-10-25T09:00:00+08:00', endsAt: '2026-10-25T12:00:00+08:00', capacity: 10, registrationKind: 'individual' }

test('inventory covers four floors and preserves canonical rooms 103 and 104', () => {
  const state = initialSystem(now)
  assert.equal(state.rooms.length, 16)
  for (const floor of [1, 2, 3, 4]) assert.equal(state.rooms.filter(r => r.floor === floor).length, 4)
  assert.equal(state.rooms.find(r => r.id === '103').name, 'Multimedia Studio')
  assert.equal(state.rooms.find(r => r.id === '104').capacity, 60)
})

test('Student request survives reload, Admin approval reaches the requester', () => {
  const { store, options } = setup()
  const booking = store.book(student, request(student))
  assert.equal(booking.status, 'pending')
  const otherAccount = createFrontendStore(options)
  assert.equal(otherAccount.getSnapshot().bookings[0].requesterId, student.id)
  otherAccount.decideBooking(admin, booking.id, 'approved')
  store.refresh()
  assert.equal(store.getSnapshot().bookings[0].status, 'approved')
})

test('Council bookings need approval; Admin bookings are immediately approved', () => {
  const { store } = setup()
  assert.equal(store.book(council, request(council)).status, 'pending')
  assert.equal(store.book(admin, request(admin, '402')).status, 'approved')
})

test('pending and approved reservations prevent overlaps but allow adjacency', () => {
  const { store } = setup()
  store.book(student, request(student))
  assert.throws(() => store.book(council, request(council)), /no longer available/)
  assert.equal(store.book(admin, request(admin, '401', 630, 700)).status, 'approved')
})

test('booking decisions revalidate unavailable rooms and stale decisions', () => {
  const { store } = setup()
  const booking = store.book(student, request(student))
  store.setRoomAvailability(admin, '401', true, 'Equipment repair')
  assert.throws(() => store.decideBooking(admin, booking.id, 'approved'), /Equipment repair/)
  store.decideBooking(admin, booking.id, 'declined', 'Please choose another room.')
  assert.throws(() => store.decideBooking(admin, booking.id, 'approved'), /already changed/)
  assert.equal(store.book(admin, request(admin, '402')).status, 'approved')
})

test('declining requires a reason and releases the reserved interval', () => {
  const { store } = setup()
  const booking = store.book(student, request(student))
  assert.throws(() => store.decideBooking(admin, booking.id, 'declined'), /reason/)
  store.decideBooking(admin, booking.id, 'declined', 'Room needed for another activity')
  assert.equal(store.book(council, request(council)).status, 'pending')
})

test('booking rejects past, reversed, over-range, blocked and impersonated input', () => {
  const { store } = setup()
  for (const patch of [{ start: 630, end: 480 }, { date: '2026-10-19' }, { date: '2026-11-01' }, { purpose: ' ' }, { roomId: '203' }, { requesterId: 'other-user' }]) assert.throws(() => store.book(student, { ...request(student), ...patch }))
  assert.equal(store.getSnapshot().bookings.length, 0)
})

test('only Admin can approve bookings or manage room availability', () => {
  const { store } = setup()
  const booking = store.book(student, request(student))
  for (const user of [null, student, council]) {
    assert.throws(() => store.decideBooking(user, booking.id, 'approved'))
    assert.throws(() => store.setRoomAvailability(user, '401', true, 'Repair'))
  }
})

test('individual registrations are immediately confirmed, duplicate-safe and persistent', () => {
  const { store, options } = setup()
  const result = store.submit(student, 'badminton', individual)
  assert.equal(result.status, 'registered')
  assert.throws(() => store.submit(student, 'badminton', individual), /already submitted/)
  assert.equal(createFrontendStore(options).getSnapshot().registrations[0].id, result.id)
  assert.equal(store.getSnapshot().applications.length, 0)
})

test('Council and Admin can register for events without approval', () => {
  const { store } = setup()
  for (const user of [council, admin]) assert.equal(store.submit(user, 'badminton', individual).status, 'registered')
  assert.equal(store.getSnapshot().registrations.length, 2)
})

test('team registration validates full rosters and prevents duplicate players across teams', () => {
  const { store } = setup()
  const input = { contact: 'captain@example.test', teamName: 'Campus Five', members: [student, council, admin, { name: 'Player Four', studentId: '20240004-C' }, { name: 'Player Five', studentId: '20240005-C' }] }
  assert.throws(() => store.submit(student, 'valorant', { ...input, members: input.members.slice(0, 4) }), /5 players/)
  assert.throws(() => store.submit(student, 'valorant', { ...input, members: [student, student, admin, ...input.members.slice(3)] }), /unique/)
  const result = store.submit(student, 'valorant', input)
  assert.equal(result.details.members.length, 5)
  assert.throws(() => store.submit(council, 'valorant', { ...input, teamName: 'Another Team' }), /already registered/)
})

test('capacity and deadline are enforced when submitting, using the latest stored snapshot', () => {
  const { store, options } = setup()
  const singleSlot = store.publish(council, { ...post, capacity: 1 })
  const otherTab = createFrontendStore(options)
  store.submit(student, singleSlot.id, { contact: 'one@example.test' })
  assert.throws(() => otherTab.submit(admin, singleSlot.id, { contact: 'two@example.test' }), /filled/)
  const expired = createFrontendStore({ ...options, clock: () => new Date('2026-11-25T00:00:00Z') })
  assert.throws(() => expired.submit(admin, 'badminton', individual), /closed/)
})

test('council recruitment has program restrictions and required answers', () => {
  const { store } = setup()
  assert.throws(() => store.submit(student, 'council-BSIT', application), /BSIT students/)
  assert.throws(() => store.submit(admin, 'council-BSCS', application), /BSCS students/)
  assert.throws(() => store.submit(student, 'council-BSCS', { ...application, answers: [''] }), /every question/)
  const result = store.submit(student, 'council-BSCS', application)
  assert.equal(result.status, 'pending')
  assert.equal(result.details.answers.length, 2)
})

test('both reviewers receive applications; decisions persist without changing real auth roles', () => {
  const { store, options } = setup()
  const result = store.submit(student, 'council-BSCS', application)
  const reviewer = createFrontendStore(options)
  assert.equal(reviewer.getSnapshot().applications[0].userId, student.id)
  reviewer.review(council, result.id, 'accepted')
  assert.throws(() => reviewer.review(admin, result.id, 'declined', 'Already reviewed'), /already changed/)
  store.refresh()
  assert.equal(store.getSnapshot().applications[0].status, 'accepted')
  assert.equal(student.role, 'student')
})

test('all four council programs support submitting and reviewing self-applications', () => {
  const { store } = setup()
  for (const course of ['BSCS', 'BSIT', 'BSIS', 'BSEMC']) {
    const result = store.submit({ ...student, id: course, course }, `council-${course}`, application)
    store.review(admin, result.id, 'declined', 'Recruitment has finished')
  }
  assert.equal(store.getSnapshot().applications.filter(a => a.status === 'declined').length, 4)
})

test('Council publishing creates shared news, game forms and configurable council forms', () => {
  const { store, options } = setup()
  for (const kind of ['announcement', 'event', 'council']) {
    const result = store.publish(council, { ...post, kind, program: 'BSCS', questions: ['Why join?'] })
    assert.equal(createFrontendStore(options).getSnapshot().posts.find(p => p.id === result.id).kind, kind)
  }
  assert.throws(() => store.publish(student, post), /Council or Administrator/)
  for (const patch of [{ title: ' ' }, { capacity: 0 }, { startsAt: 'not-a-date' }, { endsAt: post.startsAt }, { kind: 'council', program: 'unknown' }, { registrationKind: 'team', teamSize: 1 }]) assert.throws(() => store.publish(council, { ...post, ...patch }))
})

test('profile is scoped to account, and survives another account’s activity', () => {
  const { store, options } = setup()
  assert.throws(() => store.saveProfile(student, { id: admin.id, email: '' }), /own profile/)
  assert.throws(() => store.saveProfile(student, { id: student.id, email: 'invalid' }), /valid email/)
  store.saveProfile(student, { id: student.id, email: 'student@example.test', avatarUrl: '', emailVerificationReceipt: 'verified-fixture' })
  const other = createFrontendStore(options)
  other.submit(admin, 'badminton', individual)
  store.refresh()
  assert.equal(store.getSnapshot().profiles[student.id].email, 'student@example.test')
  assert.equal(store.getSnapshot().profiles[admin.id], undefined)
})

test('storage failure never reports success or mutates the visible snapshot', () => {
  const { store, storage } = setup()
  const original = store.getSnapshot()
  storage.setItem = () => { throw new Error('Quota exceeded') }
  assert.throws(() => store.submit(student, 'badminton', individual), /could not be saved/)
  assert.equal(store.getSnapshot(), original)
  assert.equal(store.getSnapshot().registrations.length, 0)
})

test('corrupt stored data blocks writes without overwriting the existing data', () => {
  const { options, storage } = setup()
  storage.setItem(systemStorageKey, '{broken')
  const store = createFrontendStore(options)
  assert.match(store.getError(), /could not be loaded/)
  assert.throws(() => store.submit(student, 'badminton', individual), /could not be loaded/)
  assert.equal(storage.getItem(systemStorageKey), '{broken')
})
