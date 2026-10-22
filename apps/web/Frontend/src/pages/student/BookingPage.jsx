import { useEffect, useRef, useState } from 'react'
import BookingToolbar from '../../features/student-booking/BookingToolbar'
import VenueCatalog from '../../components/common/BookingVenueCatalog.jsx'
import BookingTimeRange from '../../components/common/BookingTimeRange.jsx'
import { getSlotOptions, roomView, updateDraft } from '../../data/booking-selection.js'
import VenueDetails from '../../components/common/BookingVenueDetails.jsx'
import ReservationForm from '../../features/student-booking/ReservationForm'
import BookingNotice from '../../features/student-booking/BookingNotice'
import BookingRequestDialog from '../../features/student-booking/BookingRequestDialog'
import { bookingDates, filterVenues, validateRequest } from '../../features/student-booking/booking.logic'
import '../../features/student-booking/booking.css'

const systemClock = () => new Date()

export default function BookingPage({ rooms, schedules, requester, clock = systemClock, onRequest, onOpenGuidelines }) {
  const [now, setNow] = useState(() => clock())
  const [draft, setDraft] = useState(() => ({ date: bookingDates(clock())[0], shift: 'all', floor: 'all', search: '', statusFilter: 'all', roomId: null, purpose: '', slotId: '', from: '', to: '' }))
  const [requestState, setRequestState] = useState('idle')
  const [lastRequest, setLastRequest] = useState(null)
  const [error, setError] = useState(null)
  const busyRef = useRef(false)
  const formRef = useRef(null)
  const requestTriggerRef = useRef(null)
  const mountedRef = useRef(false)
  const busy = requestState === 'submitting'

  useEffect(() => {
    mountedRef.current = true
    const timer = window.setInterval(() => {
      if (busyRef.current) return
      const freshNow = clock()
      setNow(freshNow)
      setDraft(previous => updateDraft(previous, {}, { rooms, schedules, now: freshNow }))
    }, 30000)
    return () => { mountedRef.current = false; window.clearInterval(timer) }
  }, [clock, rooms, schedules])

  const dates = bookingDates(now)
  const date = dates.includes(draft.date) ? draft.date : dates[0]
  const views = rooms.map(room => roomView(room, date, draft.shift, schedules, now))
  const visible = filterVenues(views, draft)
  const selected = views.find(view => view.room.id === draft.roomId)
  const presets = selected ? getSlotOptions(selected.windows) : []
  const custom = draft.slotId === 'custom' && draft.from !== '' && draft.to !== '' && selected?.windows.some(w => Number(draft.from) >= w.start && Number(draft.to) <= w.end && Number(draft.to) > Number(draft.from))
  const slots = custom ? [...presets, { id: 'custom', start: Number(draft.from), end: Number(draft.to), preset: true }] : presets
  const slotId = date === draft.date && slots.some(slot => slot.id === draft.slotId) ? draft.slotId : ''
  const counts = {
    available: views.filter(view => view.status === 'available').length,
    occupied: views.filter(view => ['occupied', 'reserved'].includes(view.status)).length,
    unavailable: views.filter(view => view.status === 'unavailable').length,
  }

  function changeDraft(patch) {
    if (busyRef.current) return
    const freshNow = clock()
    setNow(freshNow)
    setError(null)
    setRequestState('idle')
    setDraft(previous => updateDraft(previous, patch, { rooms, schedules, now: freshNow }))
  }

  async function submitRequest(event) {
    event.preventDefault()
    if (busyRef.current) return
    const freshNow = clock()
    setNow(freshNow)
    const freshView = selected && roomView(selected.room, date, draft.shift, schedules, freshNow)
    const slot = slotId === 'custom' ? { start: Number(draft.from), end: Number(draft.to) } : freshView && getSlotOptions(freshView.windows).find(item => item.id === slotId)
    const snapshot = Object.freeze({ roomId: selected?.room.id, date, shift: draft.shift, start: slot?.start, end: slot?.end, purpose: draft.purpose.trim(), requesterId: requester.id })
    const problem = validateRequest(snapshot, { rooms, schedules, now: freshNow })
    if (problem) {
      setError(problem)
      if (problem.field === 'purpose') formRef.current?.elements.namedItem('purpose')?.focus()
      else formRef.current?.querySelector('input[type="radio"]')?.focus()
      return
    }
    if (!onRequest) { setError({ message: 'Reservation requests are unavailable. Please try again later.' }); return }
    requestTriggerRef.current = event.nativeEvent.submitter || formRef.current?.querySelector('button[type="submit"]')
    busyRef.current = true
    setError(null)
    setRequestState('submitting')
    try {
      const result = await onRequest(snapshot)
      if (typeof result?.id !== 'string' || !result.id.trim() || !['pending', 'approved'].includes(result.status)) throw new Error('The reservation response is incomplete. Please try again.')
      if (!mountedRef.current) return
      setLastRequest({ ...snapshot, ...result })
      setRequestState('pending-confirmation')
    } catch (failure) {
      if (!mountedRef.current) return
      setError({ field: failure?.code === 'CONFLICT' ? 'slot' : undefined, message: failure?.message || 'The reservation request failed. Please try again.' })
      setRequestState(failure?.code === 'CONFLICT' ? 'conflict' : 'error')
      setNow(clock())
      if (failure?.code === 'CONFLICT') setDraft(previous => ({ ...previous, slotId: '' }))
    } finally {
      busyRef.current = false
    }
  }

  function closeConfirmation() {
    setRequestState('idle')
    setLastRequest(null)
    setDraft(previous => ({ ...previous, purpose: '', slotId: '', from: '', to: '' }))
  }

  return <main className="student-booking" aria-labelledby="booking-title">
    <BookingToolbar dates={dates} date={date} shift={draft.shift} counts={counts} busy={busy} onChange={changeDraft} />
    <div className="booking-workspace"><div className="booking-left-panel"><VenueCatalog floors={[...new Set(rooms.map(room => room.floor))]} views={visible} total={rooms.length} draft={draft} selectedId={selected?.room.id} busy={busy} onChange={changeDraft} onSelect={roomId => changeDraft({ roomId: draft.roomId === roomId ? null : roomId })} /><BookingNotice onOpenGuidelines={onOpenGuidelines} busy={busy} /></div>
      <VenueDetails view={selected} date={date} shift={draft.shift} schedules={schedules} now={now}>{selected && <><BookingTimeRange view={selected} draft={draft} busy={busy} onChange={changeDraft} /><ReservationForm key={selected.room.id} requester={requester} view={selected} purpose={draft.purpose} slots={slots} slotId={slotId} error={error} busy={busy} formRef={formRef} onChange={changeDraft} onSubmit={submitRequest} /></>}</VenueDetails>
    </div>
    <BookingRequestDialog request={requestState === 'pending-confirmation' ? lastRequest : null} returnFocusRef={requestTriggerRef} onClose={closeConfirmation} />
  </main>
}
