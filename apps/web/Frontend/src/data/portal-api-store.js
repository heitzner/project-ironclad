import { effectiveUser } from './organization.js'
import { addDays } from '../features/student-booking/booking.logic.js'
import { loadPortalState, portalMutation } from '../services/portal.js'

const initialState = Object.freeze({
  version: 1,
  revision: 0,
  datasetLabel: 'Demo week',
  rooms: [],
  scheduleWindows: [{ shift: 'morning', start: 420, end: 720 }, { shift: 'evening', start: 780, end: 1080 }],
  scheduleEntries: [],
  dateOptions: [],
  posts: [],
  bookings: [],
  applications: [],
  registrations: [],
  profiles: {},
  members: {},
  handovers: [],
  organizationLog: [],
  closures: [],
  archive: [],
  directory: [],
  session: { user: null, capabilities: {} },
})

export function createPortalApiStore() {
  const listeners = new Set()
  let state = initialState
  let error = null
  let pendingRefresh = null

  const emit = () => listeners.forEach(listener => listener())
  const replace = next => {
    state = { ...initialState, ...next }
    error = null
    emit()
    return state
  }
  const mutate = async (path, method, body) => {
    const response = await portalMutation(path, method, body)
    replace(response.state)
    return response.data
  }
  const store = {
    getSnapshot: () => state,
    getError: () => error,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    async refresh(options = {}) {
      if (pendingRefresh && !options.signal) return pendingRefresh
      const load = loadPortalState(options).then(replace).catch(failure => {
        if (failure?.name !== 'AbortError') { error = failure.message; emit() }
        throw failure
      }).finally(() => { if (pendingRefresh === load) pendingRefresh = null })
      if (!options.signal) pendingRefresh = load
      return load
    },
    user: user => effectiveUser(user, state),
    schedules(snapshot = state, excludeId) {
      const closureEntries = (snapshot.closures || []).flatMap(closure => {
        const entries = []
        for (let date = closure.startDate; date <= closure.endDate; date = addDays(date, 1)) {
          entries.push({ roomId: closure.roomId, date, start: closure.start, end: closure.end, type: 'closure', title: 'Room closure', host: closure.reason })
        }
        return entries
      })
      const bookingEntries = (snapshot.bookings || [])
        .filter(booking => booking.id !== excludeId && ['pending', 'approved'].includes(booking.status))
        .map(booking => ({ ...booking, type: 'reserved', title: `${booking.status === 'pending' ? 'Pending request' : 'Reservation'} · ${booking.purpose}`, host: booking.requesterName }))
      return {
        windows: snapshot.scheduleWindows || initialState.scheduleWindows,
        entries: [...(snapshot.scheduleEntries || []), ...closureEntries, ...bookingEntries],
      }
    },
    book: (_user, input) => mutate('portal/bookings', 'POST', input),
    decideBooking: (_user, bookingId, status, reason = '') => mutate(`portal/bookings/${encodeURIComponent(bookingId)}/decision`, 'POST', { status, reason }),
    scheduleClosure: (_user, input) => mutate('portal/closures', 'POST', { ...input, start: Number(input.start), end: Number(input.end) }),
    reopenRoom: (_user, roomId) => mutate(`portal/rooms/${encodeURIComponent(roomId)}/closures`, 'DELETE'),
    publish: (_user, input) => mutate('portal/posts', 'POST', input),
    submit: (_user, postId, input) => mutate(`portal/posts/${encodeURIComponent(postId)}/submissions`, 'POST', input),
    review: (_user, applicationId, status, reason = '') => mutate(`portal/applications/${encodeURIComponent(applicationId)}/decision`, 'POST', { status, reason }),
    saveProfile: (_user, input) => mutate(`portal/profiles/${encodeURIComponent(input.id)}`, 'PATCH', input),
    assignPosition: (_user, member, position) => mutate(`portal/members/${encodeURIComponent(member.id)}/position`, 'PATCH', { position }),
    nominatePresident: (_user, memberId) => mutate('portal/handovers', 'POST', { memberId }),
    respondHandover: (_user, handoverId, action) => mutate(`portal/handovers/${encodeURIComponent(handoverId)}/respond`, 'POST', { action }),
  }
  return store
}
