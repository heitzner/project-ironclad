import { organizationActions, organizationScope, topPositions } from './organization.js'
import { mockRooms, createMockSchedules } from '../features/student-booking/booking.fixtures.js'
import { addDays, validateRequest } from '../features/student-booking/booking.logic.js'

export const systemStorageKey = 'ironclad-frontend-system-v1'
export const programs = ['BSCS', 'BSIT', 'BSIS', 'BSEMC']
export const postKinds = { announcement: 'Announcements', event: 'Event registrations', council: 'Council applications' }
const required = (value, label, max = 3000) => {
  const result = String(value ?? '').trim()
  if (!result || result.length > max) throw new Error(`Enter ${label} (${max} characters maximum).`)
  return result
}
const checkUser = user => { if (!user?.id) throw new Error('Log in to continue.'); return user }
export const canManage = user => ['admin', 'council'].includes(user?.role)
const checkManager = user => { checkUser(user); if (!canManage(user)) throw new Error('Council or Administrator access is required.') }
const checkAdmin = user => { checkUser(user); if (user.role !== 'admin') throw new Error('Administrator access is required.') }
const overlaps = (a, b) => a.roomId === b.roomId && a.date === b.date && a.start < b.end && b.start < a.end
const copy = value => JSON.parse(JSON.stringify(value))
export const manilaDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

export function initialSystem(now = new Date(), directory = []) {
  const future = days => new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10)
  const post = (id, kind, title, description, days, extra = {}) => ({
    id, kind, title, description, startsAt: `${future(days)}T09:00:00+08:00`, endsAt: `${future(days)}T17:00:00+08:00`,
    venue: 'CSD Activity Center', organizer: 'Computer Studies Department', capacity: 40, status: 'published', createdAt: now.toISOString(), ...extra,
  })
  return {
    version: 1, revision: 0,
    members: { 'test-admin': { role: 'admin', position: 'President', scope: 'ACES', course: 'BSCS' }, 'test-council': { role: 'council', position: 'President', scope: 'BSCS', course: 'BSCS' }, ...Object.fromEntries(directory.filter(person => canManage(person)).map(person => [person.id, { role: person.role, position: person.position || 'Member', scope: organizationScope(person), course: person.course }])) }, handovers: [], organizationLog: [], closures: [],
    rooms: [...mockRooms, ...[
      ['401', 'Innovation & Collaboration Lab', 40], ['402', 'AI Research Laboratory', 30],
      ['403', 'Digital Arts Studio', 35], ['404', 'Project Presentation Room', 50],
    ].map(([id, name, capacity]) => ({ id, name, capacity, floor: 4, location: 'Level 4, Innovation Wing', icon: 'c128c', selectedIcon: 'c128c', blocked: null }))],
    posts: [
      post('badminton', 'event', 'Badminton Tryouts', 'Showcase your agility and court skills! Join the official badminton team tryouts. Open to all CSD students aiming to represent the department.', 7, { imageKey: 'badminton', venue: 'Social Hall', registrationKind: 'individual', categories: ['Singles', 'Doubles'], organizer: 'CSD Sports Committee' }),
      post('valorant', 'event', 'Valorant Esports Tournament', 'Assemble your squad and compete in the CSD Fair Valorant Tournament. Celebrate teamwork, strategy, and campus spirit.', 10, { imageKey: 'esports', venue: 'CSD Computer Laboratory', capacity: 16, registrationKind: 'team', teamSize: 5, organizer: 'CSD Fair Committee' }),
      ...programs.map(program => post(`council-${program}`, 'council', `${program} Council Recruitment`, `Help shape campus life. Apply to the ${program} student council and share your ideas for the Computer Studies Department.`, 14, { program, questions: ['Why do you want to join the council?', 'What skills or experience would you bring?'], organizer: `${program} Student Council` })),
      post('csd-fair', 'announcement', 'CSD Fair 2026', 'A week of creativity, friendly competition, and community. Explore department exhibits, student projects, and activities at the CSD Fair.', 12),
      post('itechtivity', 'announcement', 'ITechtivity: Build, Learn, Connect', 'Meet fellow CSD students for technology talks and hands-on activities. Watch this space for the full campus schedule.', 15),
      post('livestream', 'announcement', 'Volleyball Tournament Livestream', 'Cheer for the department! The official CSD page will carry the volleyball tournament livestream. Match details will be posted here.', 9),
    ], bookings: [], applications: [], registrations: [], profiles: {},
    archive: [
      ['archive-hackathon', 'Technovate Hackathon', '302', 'CS 3A', 'Campus Wide'],
      ['archive-debate', 'Inter-College CS Debate Finals', '201', 'CS 3B', 'Symposium'],
      ['archive-cyber', 'Cybersecurity Workshop & CTF', '104', 'BSIT 4A', 'Workshop'],
      ['archive-robotics', 'Robotics & Embedded Systems Expo', '402', 'CS 2A', 'Exhibition'],
      ['archive-gamedev', 'GameDev Student Showcase', '403', 'BSEMC 3A', 'Showcase'],
      ['archive-alumni', 'Alumni Technology Summit', '101', 'CSD', 'Institutional'],
      ['archive-coding', 'Department Coding Challenge', '202', 'CS 1A', 'Competition'],
    ].map(([id, title, roomId, courseSection, category], index) => ({ id, title, courseSection, category,
      organizer: 'Computer Studies Department', concludedDate: new Date(now.getTime() - (index + 1) * 7 * 86400000).toISOString().slice(0, 10),
      academicYear: '2026–2027', semester: 'Term 1', venue: { id: roomId, label: `Room ${roomId}`, type: 'room' }, permitNo: `IC-2026-${101 + index}`, startTime: '09:00 AM', endTime: '05:00 PM', hasAsset: true, categoryTone: index % 2 ? 'gray' : 'green',
    })),
  }
}

// A single browser-local repository survives sign-out, account switching and reload.
// Hosts supplying App integration props continue to use their own services instead.
export function createFrontendStore({ storage, clock = () => new Date(), id = () => crypto.randomUUID(), directory = [] } = {}) {
  const listeners = new Set()
  let state = initialSystem(clock(), directory)
  const initialMembers = state.members
  let storageError = null
  const read = () => {
    const raw = storage?.getItem(systemStorageKey)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved.version !== 1 || !['rooms', 'posts', 'bookings', 'applications', 'registrations', 'archive'].every(key => Array.isArray(saved[key])) || !saved.profiles) throw new Error('Stored campus data could not be read.')
    const members = { ...(saved.members ?? initialMembers) }
    // Add newly requested accounts without undoing appointments or accepted handovers.
    for (const [key, member] of Object.entries(initialMembers)) {
      if (Object.hasOwn(members, key)) continue
      const occupied = topPositions.includes(member.position) && Object.values(members).some(existing => existing.role === member.role && existing.scope === member.scope && existing.position === member.position)
      members[key] = { ...member, position: occupied ? 'Member' : member.position }
    }
    state = { ...saved, members, handovers: saved.handovers ?? [], organizationLog: saved.organizationLog ?? [], closures: saved.closures ?? [] }
  }
  try { read() } catch { storageError = 'Stored campus data could not be loaded. Check browser storage and reload before making changes.' }
  function mutate(action) {
    if (storageError) throw new Error(storageError)
    // Re-read immediately before each transaction so another tab's changes are retained.
    try { read() } catch { throw new Error('Unable to read the latest campus data. Reload and try again.') }
    const next = copy(state)
    const result = action(next)
    next.revision += 1
    try { storage?.setItem(systemStorageKey, JSON.stringify(next)) } catch { throw new Error('Changes could not be saved. Browser storage may be full or unavailable. Your form is still here; try again.') }
    state = next
    listeners.forEach(listener => listener())
    return result
  }
  const store = {
    getSnapshot: () => state,
    getError: () => storageError,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    refresh: () => { try { read(); storageError = null } catch { storageError = 'Stored campus data could not be loaded. Reload to try again.' } listeners.forEach(listener => listener()) },
    schedules(snapshot = state, excludeId, now = clock()) {
      const schedules = createMockSchedules(now)
      const closureEntries = (snapshot.closures || []).flatMap(closure => { const entries = []; for (let date = closure.startDate; date <= closure.endDate; date = addDays(date, 1)) entries.push({ roomId: closure.roomId, date, start: closure.start, end: closure.end, type: 'closure', title: 'Room closure', host: closure.reason }); return entries })
      return { ...schedules, entries: [...schedules.entries, ...closureEntries, ...snapshot.bookings.filter(b => b.id !== excludeId && ['pending', 'approved'].includes(b.status)).map(b => ({ ...b, type: 'reserved', title: `${b.status === 'pending' ? 'Pending request' : 'Reservation'} · ${b.purpose}`, host: b.requesterName }))] }
    },
    book(user, input) {
      checkUser(user)
      return mutate(next => {
        const problem = validateRequest(input, { rooms: next.rooms, schedules: store.schedules(next), now: clock() })
        if (problem) throw new Error(problem.message)
        if (input.requesterId !== user.id) throw new Error('Book a room using your own account.')
        const booking = { ...input, purpose: required(input.purpose, 'an activity purpose', 200), id: `LCK-${id()}`, requesterId: user.id, requesterName: user.name, studentId: user.studentId, status: user.role === 'admin' ? 'approved' : 'pending', createdAt: clock().toISOString() }
        next.bookings.unshift(booking)
        return booking
      })
    },
    decideBooking(user, bookingId, status, reason = '') {
      checkAdmin(user)
      return mutate(next => {
        const booking = next.bookings.find(b => b.id === bookingId)
        if (!booking || booking.status !== 'pending') throw new Error('This request has already changed. Refresh the list.')
        if (!['approved', 'declined'].includes(status)) throw new Error('Choose a valid decision.')
        if (status === 'approved') {
          const problem = validateRequest(booking, { rooms: next.rooms, schedules: store.schedules(next, bookingId), now: clock() })
          if (problem) throw new Error(problem.message)
          if (next.bookings.some(b => b.id !== bookingId && b.status === 'approved' && overlaps(b, booking))) throw new Error('An approved reservation overlaps this request.')
        } else required(reason, 'a reason for declining', 500)
        Object.assign(booking, { status, reason: reason.trim(), reviewedBy: user.name, reviewedAt: clock().toISOString() })
        return booking
      })
    },
    setRoomAvailability(user, roomId, unavailable, reason) {
      checkAdmin(user)
      return mutate(next => {
        const room = next.rooms.find(r => r.id === roomId)
        if (!room) throw new Error('Room not found.')
        room.blocked = unavailable ? { label: 'Unavailable', reason: required(reason, 'the reason this room is unavailable', 500) } : null
        return room
      })
    },
    scheduleClosure(user, input) {
      checkAdmin(user)
      return mutate(next => {
        if (!next.rooms.some(r => r.id === input.roomId)) throw new Error('Room not found.')
        if (!['interval', 'day', 'week', 'indefinite'].includes(input.mode)) throw new Error('Choose a closure duration.')
        const reason = required(input.reason, 'the closure reason', 500)
        const room = next.rooms.find(r => r.id === input.roomId)
        if (input.mode === 'indefinite') { room.blocked = { label: 'Closed for booking', reason }; return room }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || manilaDate(new Date(input.date + 'T12:00:00+08:00')) !== input.date || input.date < manilaDate(clock())) throw new Error('Choose a valid date from today onward.')
        const start = input.mode === 'interval' ? Number(input.start) : 0
        const end = input.mode === 'interval' ? Number(input.end) : 1440
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 1440 || start >= end) throw new Error('The closure end must be after its start.')
        const closure = { id: id(), roomId: input.roomId, startDate: input.date, endDate: input.mode === 'week' ? addDays(input.date, 6) : input.date, start, end, reason, mode: input.mode }
        if (next.closures.some(c => c.roomId === input.roomId && c.startDate <= closure.endDate && closure.startDate <= c.endDate && start < c.end && c.start < end)) throw new Error('This closure overlaps an existing closure. Reopen the room or choose another period.')
        next.closures.push(closure)
        return closure
      })
    },
    reopenRoom(user, roomId) {
      checkAdmin(user)
      return mutate(next => { const room = next.rooms.find(r => r.id === roomId); if (!room) throw new Error('Room not found.'); room.blocked = null; next.closures = next.closures.filter(c => c.roomId !== roomId); return room })
    },
    publish(user, input) {
      checkManager(user)
      return mutate(next => {
        if (!Object.hasOwn(postKinds, input.kind)) throw new Error('Choose a post type.')
        const title = required(input.title, 'a title', 120)
        const description = required(input.description, 'the announcement or instructions')
        const startsAt = input.startsAt
        const endsAt = input.endsAt
        if (!Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt)) || Date.parse(startsAt) <= clock().getTime() || Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('Choose future start and end times, with the end after the start.')
        if (input.kind === 'council' && !programs.includes(input.program)) throw new Error('Choose a council program.')
        if (input.kind !== 'announcement' && (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 10000)) throw new Error('Capacity must be between 1 and 10,000.')
        if (input.kind === 'event' && !['individual', 'team'].includes(input.registrationKind)) throw new Error('Choose individual or team registration.')
        if (input.kind === 'event' && input.registrationKind === 'team' && (!Number.isInteger(input.teamSize) || input.teamSize < 2 || input.teamSize > 20)) throw new Error('Team size must be between 2 and 20.')
        const questions = input.kind === 'council' ? (input.questions ?? []).map(q => required(q, 'each application question', 200)) : []
        if (input.kind === 'council' && (!questions.length || questions.length > 10)) throw new Error('Add between 1 and 10 application questions.')
        const result = { ...input, title, description, questions, venue: required(input.venue, 'a venue or location', 120), id: `POST-${id()}`, organizer: user.name, createdBy: user.id, createdAt: clock().toISOString(), status: 'published' }
        next.posts.unshift(result)
        return result
      })
    },
    submit(user, postId, input) {
      checkUser(user)
      return mutate(next => {
        const post = next.posts.find(p => p.id === postId && p.status === 'published')
        if (!post || !['event', 'council'].includes(post.kind)) throw new Error('This form is no longer available.')
        if (Date.parse(post.startsAt) <= clock().getTime()) throw new Error('Registration for this item has closed.')
        const collection = post.kind === 'event' ? next.registrations : next.applications
        if (collection.some(r => r.postId === post.id && r.userId === user.id)) throw new Error('You have already submitted this form. Check My Activity.')
        if (collection.filter(r => r.postId === post.id && r.status !== 'declined').length >= post.capacity) throw new Error('All available slots have been filled.')
        if (post.kind === 'council' && (user.role !== 'student' || user.course !== post.program)) throw new Error(`This recruitment is open to ${post.program} students.`)
        const details = { contact: required(input.contact, 'a contact email', 200) }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.contact)) throw new Error('Enter a valid contact email.')
        if (post.kind === 'council') {
          details.answers = post.questions.map((question, index) => ({ question, answer: required(input.answers?.[index], 'an answer for every question', 1500) }))
        } else if (post.registrationKind === 'team') {
          details.teamName = required(input.teamName, 'your team name', 80)
          details.members = (input.members ?? []).map(member => ({ name: required(member.name, 'each player’s name', 120), studentId: required(member.studentId, 'each player’s student ID', 20).toUpperCase() }))
          if (details.members.length !== post.teamSize || details.members.some(m => !/^\d{8}-[A-Z]$/.test(m.studentId)) || new Set(details.members.map(m => m.studentId)).size !== details.members.length) throw new Error(`Enter ${post.teamSize} players with unique valid student IDs.`)
          if (!details.members.some(m => m.studentId === user.studentId)) throw new Error('Include yourself in the team roster.')
          if (next.registrations.some(r => r.postId === post.id && (r.details.teamName?.toLowerCase() === details.teamName.toLowerCase() || r.details.members?.some(m => details.members.some(player => player.studentId === m.studentId))))) throw new Error('A team name or player is already registered for this event.')
        } else if (post.categories?.length) {
          if (!post.categories.includes(input.category)) throw new Error('Choose a registration category.')
          details.category = input.category
        }
        const result = { id: `${post.kind === 'event' ? 'REG' : 'APP'}-${id()}`, postId, title: post.title, kind: post.kind, userId: user.id, name: user.name, studentId: user.studentId, program: user.course, details, status: post.kind === 'event' ? 'registered' : 'pending', createdAt: clock().toISOString() }
        collection.unshift(result)
        return result
      })
    },
    review(user, applicationId, status, reason = '') {
      checkManager(user)
      return mutate(next => {
        const application = next.applications.find(a => a.id === applicationId)
        if (!application || application.status !== 'pending') throw new Error('This application has already changed. Refresh the list.')
        if (!['accepted', 'declined'].includes(status)) throw new Error('Choose a valid decision.')
        if (status === 'declined') required(reason, 'a reason for declining', 500)
        Object.assign(application, { status, reason: reason.trim(), reviewedBy: user.name, reviewedAt: clock().toISOString() })
        return application
      })
    },
    saveProfile(user, input) {
      checkUser(user)
      return mutate(next => {
        if (input.id !== user.id) throw new Error('You can only update your own profile.')
        if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Enter a valid email address.')
        const previous = next.profiles[user.id] || {}
        if (input.correction) {
          const correction = { id: id(), field: required(input.correction.field, 'the record to correct', 80), value: required(input.correction.value, 'the correct information', 120), reason: required(input.correction.reason, 'the correction reason', 500), status: 'pending', at: clock().toISOString() }
          next.profiles[user.id] = { ...previous, version: (previous.version || 0) + 1, corrections: [...(previous.corrections || []), correction] }
        } else {
          const email = required(input.email, 'your school email address', 254)
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid school email address.')
          const emailChanged = email.toLowerCase() !== String(previous.email || user.email || '').trim().toLowerCase()
          if (emailChanged && !input.emailVerificationReceipt) throw new Error('Verify your new School Email before saving the change.')
          next.profiles[user.id] = { ...previous, version: (previous.version || 0) + 1, email, emailVerified: emailChanged ? false : previous.emailVerified === true, avatarUrl: input.avatarUrl, displayName: required(input.displayName || user.name, 'a display name', 120), updatedAt: clock().toISOString() }
        }
        return { confirmed: true, id: user.id }
      })
    },
  }
  Object.assign(store, organizationActions({ mutate, state: () => state, clock, id }))
  return store
}
