import { useCallback, useEffect, useState } from 'react'
import PageLayout from '../../components/common/PageLayout.jsx'
import { clockParts } from '../../features/student-booking/booking.logic'
import BookingPage from './BookingPage.jsx'

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const clock = () => new Date()
const scheduleWindows = Object.freeze([
  Object.freeze({ shift: 'morning', start: 7 * 60, end: 12 * 60 }),
  Object.freeze({ shift: 'evening', start: 13 * 60, end: 18 * 60 }),
])

async function apiRequest(path, options) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new Error('The booking service could not be reached. Confirm that the backend is running and VITE_API_URL points to it.')
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'The booking service rejected the request.')
    error.code = payload?.error?.code
    error.status = response.status
    throw error
  }
  if (!payload) throw new Error('The booking service returned an invalid response.')
  return payload
}

function toMinutes(time) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function toTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function roomId(roomCode) {
  return roomCode.replace(/^Room\s+/i, '')
}

function blockedVenue(venue) {
  if (venue.status !== 'unavailable') return null
  return {
    label: venue.status_label,
    reason: venue.is_details_available === false
      ? 'Details for this venue are unavailable, so it cannot be reserved.'
      : `${venue.status_label}. Choose another venue.`,
  }
}

async function loadBookingDate(date) {
  const query = new URLSearchParams({ date, period: 'all_day' })
  const catalog = await apiRequest(`/venues?${query}`)
  const details = await Promise.all(catalog.data.map(venue =>
    apiRequest(`/venues/${encodeURIComponent(venue.room_code)}?${query}`)))

  const detailByRoom = new Map(details.map(payload => [payload.data.room_code, payload.data]))
  const rooms = catalog.data.map(venue => {
    const detail = detailByRoom.get(venue.room_code) || venue
    return {
      id: roomId(venue.room_code),
      floor: venue.floor,
      name: venue.name,
      capacity: venue.capacity,
      location: venue.location_label,
      equipment: detail.equipment || [],
      icon: 'd6359',
      selectedIcon: '6f4c7',
      blocked: blockedVenue(venue),
    }
  })

  const entries = details.flatMap(payload => payload.data.timetable
    .filter(slot => slot.state !== 'free_window')
    .map(slot => ({
      date,
      roomId: roomId(payload.data.room_code),
      start: toMinutes(slot.start_time),
      end: toMinutes(slot.end_time),
      type: slot.state === 'occupied' ? 'class' : 'reserved',
      title: slot.state === 'occupied' ? 'Scheduled class or activity' : 'Reserved venue',
    })))

  return { rooms, schedules: { windows: scheduleWindows, entries } }
}

function LoadingState() {
  return <main className="student-booking" aria-labelledby="booking-loading-title"><section className="booking-empty-details" role="status"><h1 id="booking-loading-title">Loading room bookings…</h1><p>Retrieving the current venue schedule.</p></section></main>
}

function ErrorState({ message, onRetry }) {
  return <main className="student-booking" aria-labelledby="booking-error-title"><section className="booking-empty-details" role="alert"><h1 id="booking-error-title">Room bookings are unavailable</h1><p>{message}</p><button type="button" onClick={onRetry}>Retry</button></section></main>
}

export default function Booking() {
  const [bootstrap, setBootstrap] = useState({ status: 'loading', dates: [], requester: null, error: null })
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setBootstrap(previous => ({ ...previous, status: 'loading', error: null }))
      try {
        const [datePayload, configPayload] = await Promise.all([
          apiRequest('/dates/options'),
          apiRequest('/reservations/config'),
        ])
        if (cancelled) return
        const today = clockParts(clock()).date
        const futureDates = datePayload.data.map(option => option.date).filter(date => date >= today)
        const dates = futureDates.length ? futureDates : datePayload.data.map(option => option.date)
        const source = configPayload.data.requester
        setBootstrap({
          status: 'ready',
          dates,
          requester: {
            id: source.student_id,
            name: source.full_name,
            studentId: source.student_id,
            program: source.program_section,
          },
          error: null,
        })
      } catch (error) {
        if (!cancelled) setBootstrap({ status: 'error', dates: [], requester: null, error: error.message })
      }
    }
    load()
    return () => { cancelled = true }
  }, [retryToken])

  const requestReservation = useCallback(async request => {
    const payload = await apiRequest('/reservations/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_code: `Room ${request.roomId}`,
        date: request.date,
        start_time: toTime(request.start),
        end_time: toTime(request.end),
        purpose: request.purpose,
        student_id: request.requesterId,
      }),
    })
    return {
      id: payload.data.reservation_id,
      status: payload.data.decision === 'pending' ? 'pending' : payload.data.decision,
    }
  }, [])

  return <PageLayout role="student" fullWidth>
    {bootstrap.status === 'loading' && <LoadingState />}
    {bootstrap.status === 'error' && <ErrorState message={bootstrap.error} onRetry={() => setRetryToken(value => value + 1)} />}
    {bootstrap.status === 'ready' && <BookingPage dates={bootstrap.dates} requester={bootstrap.requester} clock={clock} loadDate={loadBookingDate} onRequest={requestReservation} />}
  </PageLayout>
}
