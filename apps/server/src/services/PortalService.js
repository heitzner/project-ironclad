import { HttpError } from '../http/errors.js'
import { programs } from '../data/seed.js'

const topPositions = ['President', 'Vice President', 'Secretary']
const positions = [...topPositions, 'Treasurer', 'Auditor', 'Committee Member', 'Member']
const clone = value => structuredClone(value)
const required = (value, label, max = 3000) => {
  const result = String(value ?? '').trim()
  if (!result || result.length > max) throw new HttpError(422, 'VALIDATION_ERROR', `Enter ${label}.`)
  return result
}
const overlaps = (a, b) => a.roomId === b.roomId && a.date === b.date && Number(a.start) < Number(b.end) && Number(b.start) < Number(a.end)
const membershipScope = user => user.role === 'admin' ? 'ACES' : user.course
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''))
const manilaClock = date => {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(({ type, value }) => [type, value]))
  return { date: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute) }
}

export class PortalService {
  constructor(repository, authService, { clock = () => new Date() } = {}) {
    this.repository = repository
    this.authService = authService
    this.clock = clock
  }

  #assertSignedIn(user) { if (!user?.id) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue') }
  #assertRole(user, roles, message = 'You do not have permission to perform this action') {
    this.#assertSignedIn(user)
    if (!roles.includes(user.role)) throw new HttpError(403, 'FORBIDDEN', message)
  }
  #assertAdmin(user) { this.#assertRole(user, ['admin'], 'Administrator access is required') }
  #assertTopThree(user) {
    this.#assertRole(user, ['admin', 'council'])
    if (!topPositions.includes(user.position)) throw new HttpError(403, 'FORBIDDEN', 'Only the President, Vice President, and Secretary can manage this organization')
  }

  stateFor(account = null) {
    const state = this.repository.readState()
    const user = account ? this.authService.currentUser(account) : null
    const manager = ['admin', 'council'].includes(user?.role)
    const own = record => record.userId === user?.id || record.requesterId === user?.id
    const applications = user?.role === 'admin' ? state.applications
      : user?.role === 'council' ? state.applications.filter(item => item.program === user.course)
        : state.applications.filter(own)
    const registrations = manager ? state.registrations : state.registrations.filter(own)
    const bookings = user?.role === 'admin' ? state.bookings : state.bookings.filter(own)
    const profiles = user ? Object.fromEntries(Object.entries(state.profiles).map(([id, profile]) => [id,
      id === user?.id ? profile : { displayName: profile.displayName, avatarUrl: profile.avatarUrl },
    ])) : {}
    const directory = user ? state.accounts.map(accountRecord => this.authService.currentUser(accountRecord)) : []
    return clone({
      version: state.version, revision: state.revision, datasetLabel: state.datasetLabel,
      rooms: state.rooms, scheduleWindows: state.scheduleWindows, scheduleEntries: state.scheduleEntries,
      dateOptions: state.dateOptions, posts: state.posts, bookings, applications, registrations, profiles,
      members: user ? state.members : {}, handovers: user ? state.handovers.filter(item => manager && item.role === user.role && item.scope === membershipScope(user)) : [],
      organizationLog: manager ? state.organizationLog.filter(item => user.role === 'admin' || item.scope === user.course) : [],
      closures: state.closures, archive: user ? state.archive : [], directory,
      session: { user, capabilities: this.authService.capabilities(user) },
    })
  }

  #result(account, data) { return { data, state: this.stateFor(account) } }

  createBooking(account, input) {
    const user = this.authService.currentUser(account)
    this.#assertSignedIn(user)
    const state = this.repository.readState()
    const room = state.rooms.find(item => item.id === String(input.roomId))
    if (!room) throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room not found')
    if (room.blocked) throw new HttpError(422, 'ROOM_UNAVAILABLE', room.blocked.reason || 'This room is unavailable')
    if (!state.dateOptions.includes(input.date)) throw new HttpError(422, 'INVALID_DATE', 'Choose a date within the next seven days')
    if (!['all', 'morning', 'evening'].includes(input.shift)) throw new HttpError(422, 'INVALID_SHIFT', 'Choose a valid booking shift')
    const start = Number(input.start), end = Number(input.end)
    if (!Number.isInteger(start) || !Number.isInteger(end) || start >= end) throw new HttpError(422, 'INVALID_TIME', 'Select a valid requested duration')
    const current = manilaClock(this.clock())
    if (input.date === current.date && start <= current.minute) throw new HttpError(422, 'TIME_PASSED', 'This time has passed. Choose a new available window')
    const eligibleWindows = state.scheduleWindows.filter(window => input.shift === 'all' || window.shift === input.shift)
    if (!eligibleWindows.some(window => start >= window.start && end <= window.end)) throw new HttpError(422, 'INVALID_TIME', 'The requested time is outside the selected booking period')
    const candidate = { roomId: room.id, date: input.date, start, end }
    const conflicts = [
      ...state.scheduleEntries.map(item => ({ ...item, roomId: String(item.roomId) })),
      ...state.bookings.filter(item => ['pending', 'approved'].includes(item.status)),
      ...state.closures.flatMap(item => state.dateOptions.filter(date => item.startDate <= date && date <= item.endDate).map(date => ({ ...item, date }))),
    ]
    if (conflicts.some(item => overlaps(item, candidate))) throw new HttpError(409, 'BOOKING_CONFLICT', 'This room and time are no longer available')
    const booking = this.repository.transaction(next => {
      const result = {
        id: this.repository.nextId('LCK'), roomId: room.id, date: input.date, shift: input.shift, start, end,
        purpose: required(input.purpose, 'an activity purpose', 200), requesterId: user.id, requesterName: user.name,
        studentId: user.studentId, status: user.role === 'admin' ? 'approved' : 'pending', createdAt: this.clock().toISOString(),
      }
      next.bookings.unshift(result)
      return result
    })
    return this.#result(account, booking)
  }

  decideBooking(account, bookingId, { status, reason = '' }) {
    const user = this.authService.currentUser(account)
    this.#assertAdmin(user)
    if (!['approved', 'declined'].includes(status)) throw new HttpError(422, 'INVALID_DECISION', 'Choose a valid booking decision')
    const booking = this.repository.transaction(state => {
      const current = state.bookings.find(item => item.id === bookingId)
      if (!current) throw new HttpError(404, 'BOOKING_NOT_FOUND', 'Booking request not found')
      if (current.status !== 'pending') throw new HttpError(409, 'BOOKING_CHANGED', 'This request has already changed')
      if (status === 'declined') required(reason, 'a reason for declining', 500)
      if (status === 'approved') {
        const conflicts = [
          ...state.scheduleEntries,
          ...state.bookings.filter(item => item.id !== bookingId && item.status === 'approved'),
          ...state.closures.flatMap(item => state.dateOptions.filter(date => item.startDate <= date && date <= item.endDate).map(date => ({ ...item, date }))),
        ]
        if (conflicts.some(item => overlaps(item, current))) throw new HttpError(409, 'BOOKING_CONFLICT', 'An approved reservation overlaps this request')
      }
      Object.assign(current, { status, reason: String(reason).trim(), reviewedBy: user.name, reviewedAt: this.clock().toISOString() })
      return current
    })
    return this.#result(account, booking)
  }

  createClosure(account, input) {
    const user = this.authService.currentUser(account)
    this.#assertAdmin(user)
    const state = this.repository.readState()
    const room = state.rooms.find(item => item.id === String(input.roomId))
    if (!room) throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room not found')
    if (!['interval', 'day', 'week', 'indefinite'].includes(input.mode)) throw new HttpError(422, 'INVALID_CLOSURE', 'Choose a closure duration')
    const reason = required(input.reason, 'the closure reason', 500)
    let result
    if (input.mode === 'indefinite') {
      result = this.repository.transaction(next => { const target = next.rooms.find(item => item.id === room.id); target.blocked = { label: 'Closed for booking', reason }; return target })
    } else {
      if (!state.dateOptions.includes(input.date)) throw new HttpError(422, 'INVALID_DATE', 'Choose a date within the next seven days')
      const start = input.mode === 'interval' ? Number(input.start) : 0
      const end = input.mode === 'interval' ? Number(input.end) : 1440
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 1440 || start >= end) throw new HttpError(422, 'INVALID_TIME', 'The closure end must be after its start')
      const endIndex = input.mode === 'week' ? Math.min(state.dateOptions.indexOf(input.date) + 6, state.dateOptions.length - 1) : state.dateOptions.indexOf(input.date)
      const closure = { id: this.repository.nextId('CLS'), roomId: room.id, startDate: input.date, endDate: state.dateOptions[endIndex], start, end, reason, mode: input.mode, createdBy: user.id, createdAt: this.clock().toISOString() }
      if (state.closures.some(item => item.roomId === closure.roomId && item.startDate <= closure.endDate && closure.startDate <= item.endDate && start < item.end && item.start < end)) throw new HttpError(409, 'CLOSURE_CONFLICT', 'This closure overlaps an existing closure')
      result = this.repository.transaction(next => { next.closures.push(closure); return closure })
    }
    return this.#result(account, result)
  }

  reopenRoom(account, roomId) {
    const user = this.authService.currentUser(account)
    this.#assertAdmin(user)
    const room = this.repository.transaction(state => {
      const target = state.rooms.find(item => item.id === roomId)
      if (!target) throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room not found')
      target.blocked = null
      state.closures = state.closures.filter(item => item.roomId !== roomId)
      return target
    })
    return this.#result(account, room)
  }

  publish(account, input) {
    const user = this.authService.currentUser(account)
    this.#assertRole(user, ['admin', 'council'], 'Council or Administrator access is required')
    if (!['announcement', 'event', 'council'].includes(input.kind)) throw new HttpError(422, 'INVALID_POST_TYPE', 'Choose a post type')
    if (!Number.isFinite(Date.parse(input.startsAt)) || !Number.isFinite(Date.parse(input.endsAt)) || Date.parse(input.startsAt) <= this.clock().getTime() || Date.parse(input.endsAt) <= Date.parse(input.startsAt)) throw new HttpError(422, 'INVALID_SCHEDULE', 'Choose future start and end times, with the end after the start')
    if (input.kind === 'council' && (!programs.includes(input.program) || user.role === 'council' && input.program !== user.course)) throw new HttpError(403, 'WRONG_COUNCIL_SCOPE', 'Council officers may publish recruitment only for their own program')
    if (input.kind !== 'announcement' && (!Number.isInteger(Number(input.capacity)) || Number(input.capacity) < 1 || Number(input.capacity) > 10000)) throw new HttpError(422, 'INVALID_CAPACITY', 'Capacity must be between 1 and 10,000')
    if (input.kind === 'event' && !['individual', 'team'].includes(input.registrationKind)) throw new HttpError(422, 'INVALID_REGISTRATION_TYPE', 'Choose individual or team registration')
    if (input.kind === 'event' && input.registrationKind === 'team' && (!Number.isInteger(Number(input.teamSize)) || Number(input.teamSize) < 2 || Number(input.teamSize) > 20)) throw new HttpError(422, 'INVALID_TEAM_SIZE', 'Team size must be between 2 and 20')
    const questions = input.kind === 'council' ? (input.questions || []).map(question => required(question, 'each application question', 200)) : []
    if (input.kind === 'council' && (!questions.length || questions.length > 10)) throw new HttpError(422, 'INVALID_QUESTIONS', 'Add between 1 and 10 application questions')
    const post = this.repository.transaction(state => {
      const result = { ...input, title: required(input.title, 'a title', 120), description: required(input.description, 'the announcement or instructions'), venue: required(input.venue, 'a venue or location', 120), capacity: input.kind === 'announcement' ? undefined : Number(input.capacity), teamSize: input.teamSize ? Number(input.teamSize) : undefined, questions, id: this.repository.nextId('POST'), organizer: user.name, createdBy: user.id, createdAt: this.clock().toISOString(), status: 'published' }
      state.posts.unshift(result)
      return result
    })
    return this.#result(account, post)
  }

  submit(account, postId, input) {
    const user = this.authService.currentUser(account)
    this.#assertSignedIn(user)
    const state = this.repository.readState()
    const post = state.posts.find(item => item.id === postId && item.status === 'published')
    if (!post || !['event', 'council'].includes(post.kind)) throw new HttpError(404, 'FORM_NOT_FOUND', 'This form is no longer available')
    if (Date.parse(post.startsAt) <= this.clock().getTime()) throw new HttpError(422, 'REGISTRATION_CLOSED', 'Registration for this item has closed')
    const collection = post.kind === 'event' ? state.registrations : state.applications
    if (collection.some(item => item.postId === post.id && item.userId === user.id)) throw new HttpError(409, 'DUPLICATE_SUBMISSION', 'You have already submitted this form')
    if (collection.filter(item => item.postId === post.id && item.status !== 'declined').length >= post.capacity) throw new HttpError(409, 'CAPACITY_REACHED', 'All available slots have been filled')
    if (post.kind === 'council' && (user.role !== 'student' || user.course !== post.program)) throw new HttpError(403, 'INELIGIBLE', `This recruitment is open to ${post.program} students`)
    const details = { contact: required(input.contact, 'a contact email', 200) }
    if (!validEmail(details.contact)) throw new HttpError(422, 'INVALID_EMAIL', 'Enter a valid contact email')
    if (post.kind === 'council') details.answers = post.questions.map((question, index) => ({ question, answer: required(input.answers?.[index], 'an answer for every question', 1500) }))
    else if (post.registrationKind === 'team') {
      details.teamName = required(input.teamName, 'your team name', 80)
      details.members = (input.members || []).map(member => ({ name: required(member.name, 'each player’s name', 120), studentId: required(member.studentId, 'each player’s student ID', 20).toUpperCase() }))
      if (details.members.length !== post.teamSize || new Set(details.members.map(item => item.studentId)).size !== details.members.length || !details.members.some(item => item.studentId === user.studentId)) throw new HttpError(422, 'INVALID_TEAM', `Enter ${post.teamSize} unique players and include yourself`)
      if (state.registrations.some(item => item.postId === post.id && (item.details.teamName?.toLowerCase() === details.teamName.toLowerCase() || item.details.members?.some(member => details.members.some(player => player.studentId === member.studentId))))) throw new HttpError(409, 'TEAM_CONFLICT', 'A team name or player is already registered for this event')
    } else if (post.categories?.length) {
      if (!post.categories.includes(input.category)) throw new HttpError(422, 'INVALID_CATEGORY', 'Choose a registration category')
      details.category = input.category
    }
    const result = this.repository.transaction(next => {
      const record = { id: this.repository.nextId(post.kind === 'event' ? 'REG' : 'APP'), postId, title: post.title, kind: post.kind, userId: user.id, name: user.name, studentId: user.studentId, program: user.course, details, status: post.kind === 'event' ? 'registered' : 'pending', createdAt: this.clock().toISOString() }
      ;(post.kind === 'event' ? next.registrations : next.applications).unshift(record)
      return record
    })
    return this.#result(account, result)
  }

  reviewApplication(account, applicationId, { status, reason = '' }) {
    const user = this.authService.currentUser(account)
    this.#assertRole(user, ['admin', 'council'], 'Council or Administrator access is required')
    if (!['accepted', 'declined'].includes(status)) throw new HttpError(422, 'INVALID_DECISION', 'Choose a valid application decision')
    const application = this.repository.transaction(state => {
      const current = state.applications.find(item => item.id === applicationId)
      if (!current) throw new HttpError(404, 'APPLICATION_NOT_FOUND', 'Application not found')
      if (current.status !== 'pending') throw new HttpError(409, 'APPLICATION_CHANGED', 'This application has already changed')
      if (user.role === 'council' && current.program !== user.course) throw new HttpError(403, 'WRONG_COUNCIL_SCOPE', 'You may review only your own council program')
      if (status === 'declined') required(reason, 'a reviewer note', 500)
      Object.assign(current, { status, reason: String(reason).trim(), reviewedBy: user.name, reviewedAt: this.clock().toISOString() })
      if (status === 'accepted') state.members[current.userId] = { role: 'council', position: 'Member', scope: current.program, course: current.program }
      return current
    })
    return this.#result(account, application)
  }

  saveProfile(account, profileId, input) {
    const user = this.authService.currentUser(account)
    this.#assertSignedIn(user)
    if (profileId !== user.id || input.id !== user.id) throw new HttpError(403, 'FORBIDDEN', 'You can only update your own profile')
    const previous = this.repository.readState().profiles[user.id] || {}
    let profile
    if (input.correction) {
      const correction = { id: this.repository.nextId('COR'), field: required(input.correction.field, 'the record to correct', 80), value: required(input.correction.value, 'the correct information', 120), reason: required(input.correction.reason, 'the correction reason', 500), status: 'pending', at: this.clock().toISOString() }
      profile = this.repository.transaction(state => { const value = { ...(state.profiles[user.id] || {}), version: (state.profiles[user.id]?.version || 0) + 1, corrections: [...(state.profiles[user.id]?.corrections || []), correction] }; state.profiles[user.id] = value; state.identityCorrections.push({ ...correction, userId: user.id }); return value })
    } else {
      const email = required(input.email, 'your school email address', 254).toLowerCase()
      if (!validEmail(email)) throw new HttpError(422, 'INVALID_EMAIL', 'Enter a valid school email address')
      const changed = email !== String(previous.email || user.email).toLowerCase()
      if (changed) this.authService.consumeReceipt(input.emailVerificationReceipt, { purpose: 'email-change', email, accountId: user.id })
      profile = this.repository.transaction(state => { const value = { ...(state.profiles[user.id] || {}), version: (state.profiles[user.id]?.version || 0) + 1, email, emailVerified: true, avatarUrl: String(input.avatarUrl || ''), displayName: required(input.displayName || user.name, 'a display name', 120), updatedAt: this.clock().toISOString() }; state.profiles[user.id] = value; const target = state.accounts.find(item => item.id === user.id); target.email = email; return value })
    }
    return this.#result(account, { confirmed: true, id: user.id, profile })
  }

  assignPosition(account, memberId, { position }) {
    const user = this.authService.currentUser(account)
    this.#assertTopThree(user)
    if ((!positions.includes(position) && position !== 'Student') || position === 'President') throw new HttpError(422, 'INVALID_POSITION', 'The President position changes through an accepted handover')
    const result = this.repository.transaction(state => {
      if (memberId === user.id) throw new HttpError(422, 'INVALID_MEMBER', 'Choose another member')
      const accountRecord = state.accounts.find(item => item.id === memberId)
      const target = state.members[memberId]
      if (!accountRecord || !target) throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found')
      const scope = membershipScope(user)
      if (user.role === 'council' && accountRecord.course !== scope || target.role === 'admin' && user.role !== 'admin') throw new HttpError(403, 'WRONG_ORGANIZATION', 'Choose a member from your own organization')
      if (target.position === 'President') throw new HttpError(422, 'USE_HANDOVER', 'Use presidential handover for the current President')
      if (user.position !== 'President' && (topPositions.includes(position) || topPositions.includes(target.position))) throw new HttpError(403, 'PRESIDENT_REQUIRED', 'Only the President can appoint or change the Vice President and Secretary')
      if (topPositions.includes(position) && Object.entries(state.members).some(([id, member]) => id !== memberId && member.role === user.role && member.scope === scope && member.position === position)) throw new HttpError(409, 'POSITION_OCCUPIED', `This organization already has a ${position}`)
      state.members[memberId] = position === 'Student' ? { role: 'student', position: '', scope: '', course: accountRecord.course } : { role: user.role, position, scope, course: accountRecord.course }
      state.organizationLog.unshift({ id: this.repository.nextId('LOG'), actor: user.name, text: `${accountRecord.name} appointed ${position} · ${scope}`, scope, at: this.clock().toISOString() })
      return { confirmed: true, id: memberId }
    })
    return this.#result(account, result)
  }

  nominatePresident(account, { memberId }) {
    const user = this.authService.currentUser(account)
    this.#assertTopThree(user)
    if (user.position !== 'President') throw new HttpError(403, 'PRESIDENT_REQUIRED', 'Only the President can nominate a successor')
    const nomination = this.repository.transaction(state => {
      const target = state.members[memberId], scope = membershipScope(user)
      if (memberId === user.id || !target || target.role !== user.role || target.scope !== scope) throw new HttpError(422, 'INVALID_SUCCESSOR', 'Choose another current member of your organization')
      if (state.handovers.some(item => item.scope === scope && item.role === user.role && item.status === 'pending')) throw new HttpError(409, 'HANDOVER_PENDING', 'A nomination is already awaiting acceptance')
      const result = { id: this.repository.nextId('HND'), from: user.id, to: memberId, scope, role: user.role, status: 'pending', at: this.clock().toISOString() }
      state.handovers.unshift(result); return result
    })
    return this.#result(account, nomination)
  }

  respondHandover(account, handoverId, { action }) {
    const user = this.authService.currentUser(account)
    this.#assertSignedIn(user)
    const result = this.repository.transaction(state => {
      const nomination = state.handovers.find(item => item.id === handoverId && item.status === 'pending')
      if (!nomination) throw new HttpError(404, 'HANDOVER_NOT_FOUND', 'This nomination is no longer pending')
      if (action === 'cancel' && nomination.from === user.id) { nomination.status = 'cancelled'; return nomination }
      if (nomination.to !== user.id || !['accept', 'decline'].includes(action)) throw new HttpError(403, 'FORBIDDEN', 'Only the nominated successor can accept or decline')
      const outgoing = state.members[nomination.from], incoming = state.members[nomination.to]
      if (outgoing?.position !== 'President' || outgoing.role !== nomination.role || outgoing.scope !== nomination.scope || incoming?.role !== nomination.role || incoming.scope !== nomination.scope) throw new HttpError(409, 'MEMBERSHIP_CHANGED', 'Organization membership changed; request a new nomination')
      nomination.status = action === 'accept' ? 'accepted' : 'declined'; nomination.respondedAt = this.clock().toISOString()
      if (action === 'accept') { outgoing.position = 'Member'; incoming.position = 'President' }
      state.organizationLog.unshift({ id: this.repository.nextId('LOG'), actor: user.name, text: `Presidential nomination ${nomination.status} · ${nomination.scope}`, scope: nomination.scope, at: this.clock().toISOString() })
      return nomination
    })
    return this.#result(account, result)
  }

  dashboard(account) {
    const user = this.authService.currentUser(account)
    this.#assertAdmin(user)
    const state = this.repository.readState()
    return { revision: state.revision, counts: { accounts: state.accounts.length, rooms: state.rooms.length, pendingBookings: state.bookings.filter(item => item.status === 'pending').length, activeEvents: state.posts.filter(item => item.kind === 'event' && item.status === 'published' && Date.parse(item.endsAt) > this.clock().getTime()).length, pendingApplications: state.applications.filter(item => item.status === 'pending').length } }
  }

  archive(account, filters = {}) {
    this.#assertSignedIn(this.authService.currentUser(account))
    const records = this.repository.readState().archive.filter(record => (!filters.academicYear || record.academicYear === filters.academicYear) && (!filters.semester || record.semester === filters.semester) && (!filters.venueId || record.venue.id === filters.venueId) && (!filters.q || `${record.title} ${record.organizer} ${record.permitNo}`.toLowerCase().includes(String(filters.q).toLowerCase())))
    return { records, formats: ['pdf', 'csv'], summary: { totalArchived: records.length, coverageLabel: 'Campus event records' }, filters: { academicYears: [...new Set(records.map(item => item.academicYear))], semesters: [...new Set(records.map(item => item.semester))], venues: [...new Map(records.map(item => [item.venue.id, item.venue])).values()] }, policy: 'Download an event record or export the records matching your filters.' }
  }
}
