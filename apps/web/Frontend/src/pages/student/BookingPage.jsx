import { useMemo, useRef, useState } from 'react'
import BookingConnectionState from '../../components/student/BookingConnectionState.jsx'
import BookingToolbar from '../../features/student-booking/BookingToolbar.jsx'
import VenueCatalog from '../../features/student-booking/VenueCatalog.jsx'
import VenueDetails from '../../features/student-booking/VenueDetails.jsx'
import ReservationForm from '../../features/student-booking/ReservationForm.jsx'
import BookingNotice from '../../features/student-booking/BookingNotice.jsx'
import BookingRequestDialog from '../../features/student-booking/BookingRequestDialog.jsx'
import { getSlotOptions } from '../../features/student-booking/booking.logic.js'
import { useVenueCatalog } from '../../hooks/useVenueCatalog.js'
import { useVenueDetails } from '../../hooks/useVenueDetails.js'
import { catalogVenueToView, shiftToPeriod, venueDetailsToView } from '../../services/bookingAdapter.js'
import '../../features/student-booking/booking.css'

const emptySchedules = { windows: [], entries: [] }

export default function BookingPage({ dates, defaultDate, datasetLabel, requester, notice, onRequest, onOpenGuidelines }) {
  const [draft, setDraft] = useState(() => ({
    date: defaultDate,
    shift: 'all',
    floor: 'all',
    search: '',
    statusFilter: 'all',
    roomId: null,
    purpose: '',
    slotId: '',
  }))
  const [requestState, setRequestState] = useState('idle')
  const [lastRequest, setLastRequest] = useState(null)
  const [error, setError] = useState(null)
  const busyRef = useRef(false)
  const formRef = useRef(null)
  const requestTriggerRef = useRef(null)
  const busy = requestState === 'submitting'
  const date = dates.includes(draft.date) ? draft.date : defaultDate
  const period = shiftToPeriod(draft.shift)

  const catalog = useVenueCatalog({
    date,
    period,
    floor: draft.floor,
    q: draft.search.trim(),
  })
  const views = useMemo(() => (
    catalog.data?.data.map((venue) => catalogVenueToView(venue, catalog.data.meta.period_windows)) ?? []
  ), [catalog.data])
  const visible = draft.statusFilter === 'all'
    ? views
    : views.filter((view) => view.status === draft.statusFilter)
  const selectedCatalog = views.find((view) => view.room.id === draft.roomId) ?? null

  const details = useVenueDetails({
    roomCode: selectedCatalog ? `Room ${selectedCatalog.room.id}` : '',
    date,
    period,
  })
  const detailsModel = useMemo(() => details.data ? venueDetailsToView(details.data) : null, [details.data])
  const selected = detailsModel?.view ?? selectedCatalog
  const schedules = detailsModel?.schedules ?? emptySchedules
  const now = detailsModel?.now ?? new Date()
  const slots = detailsModel && selected ? getSlotOptions(selected.windows) : []
  const slotId = slots.some((slot) => slot.id === draft.slotId) ? draft.slotId : ''
  const counts = catalog.data?.meta.summary ?? { available: 0, occupied: 0, unavailable: 0 }

  function changeDraft(patch) {
    if (busyRef.current) return
    setError(null)
    setRequestState('idle')
    setDraft((previous) => {
      const next = { ...previous, ...patch }
      if ('date' in patch || 'shift' in patch || 'roomId' in patch) next.slotId = ''
      if ('floor' in patch) {
        next.roomId = null
        next.slotId = ''
      }
      if ('statusFilter' in patch && patch.statusFilter !== 'all') {
        const current = views.find((view) => view.room.id === previous.roomId)
        if (current && current.status !== patch.statusFilter) {
          next.roomId = null
          next.slotId = ''
        }
      }
      return next
    })
  }

  async function submitRequest(event) {
    event.preventDefault()
    if (busyRef.current) return
    const slot = slots.find((item) => item.id === slotId)
    if (!draft.purpose.trim()) {
      setError({ field: 'purpose', message: 'Enter an activity purpose or organization.' })
      formRef.current?.elements.namedItem('purpose')?.focus()
      return
    }
    if (!selected || !slot) {
      setError({ field: 'slot', message: 'Select an available reservation duration.' })
      formRef.current?.querySelector('input[type="radio"]')?.focus()
      return
    }
    if (!onRequest) {
      setError({ message: 'Reservation requests are unavailable. Please try again later.' })
      return
    }

    const snapshot = Object.freeze({
      roomId: selected.room.id,
      date,
      shift: draft.shift,
      start: slot.start,
      end: slot.end,
      purpose: draft.purpose.trim(),
      requesterId: requester.id,
    })
    requestTriggerRef.current = event.nativeEvent.submitter || formRef.current?.querySelector('button[type="submit"]')
    busyRef.current = true
    setError(null)
    setRequestState('submitting')
    try {
      const result = await onRequest(snapshot)
      if (!result?.id || result.status !== 'pending') throw new Error('The booking service returned an invalid response. Please try again.')
      setLastRequest({ ...snapshot, ...result })
      setRequestState('pending-confirmation')
      catalog.refetch()
      details.refetch()
    } catch (failure) {
      const conflict = failure?.code === 'SLOT_CONFLICT' || failure?.status === 409
      setError({ field: conflict ? 'slot' : undefined, message: failure?.message || 'The reservation request failed. Please try again.' })
      setRequestState(conflict ? 'conflict' : 'error')
      if (conflict) setDraft((previous) => ({ ...previous, slotId: '' }))
      catalog.refetch()
      details.refetch()
    } finally {
      busyRef.current = false
    }
  }

  function closeConfirmation() {
    setRequestState('idle')
    setLastRequest(null)
    setDraft((previous) => ({ ...previous, purpose: '', slotId: '' }))
  }

  if (!catalog.data && catalog.loading) return <BookingConnectionState loading />
  if (!catalog.data && catalog.error) return <BookingConnectionState error={catalog.error} onRetry={catalog.refetch} />

  return <main className="student-booking" aria-labelledby="booking-title">
    <BookingToolbar dates={dates} date={date} shift={draft.shift} counts={counts} datasetLabel={datasetLabel} busy={busy} onChange={changeDraft} />
    <div className="booking-workspace"><div className="booking-left-panel"><VenueCatalog views={visible} total={catalog.data?.meta.floor_counts.all_venues ?? 0} draft={draft} selectedId={selected?.room.id} busy={busy} onChange={changeDraft} onSelect={(roomId) => changeDraft({ roomId })} /><BookingNotice notice={notice} onOpenGuidelines={onOpenGuidelines} busy={busy} /></div>
      <VenueDetails view={selected} date={date} shift={draft.shift} schedules={schedules} now={now} loading={Boolean(selectedCatalog) && details.loading} error={details.error} onRetry={details.refetch}>{selected && detailsModel && <ReservationForm key={selected.room.id} requester={requester} view={selected} purpose={draft.purpose} slots={slots} slotId={slotId} error={error} busy={busy} formRef={formRef} onChange={changeDraft} onSubmit={submitRequest} />}</VenueDetails>
    </div>
    <BookingRequestDialog request={requestState === 'pending-confirmation' ? lastRequest : null} returnFocusRef={requestTriggerRef} onClose={closeConfirmation} />
  </main>
}
