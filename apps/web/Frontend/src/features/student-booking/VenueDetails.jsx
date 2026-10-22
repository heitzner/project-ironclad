import BookingIcon from './BookingIcon'
import { clockParts, formatDate, formatTime, overlaps, timeRange } from './booking.logic'

export default function VenueDetails({ view, date, shift, schedules, now, loading = false, error = null, onRetry, children }) {
  if (loading) return <aside className="booking-empty-details" aria-live="polite"><h2>Loading venue details</h2><p>Fetching the timetable and available reservation windows.</p></aside>
  if (error) return <aside className="booking-empty-details" role="alert"><h2>Unable to load venue details</h2><p>{error.message}</p><button type="button" onClick={onRetry}>Retry</button></aside>
  if (!view) return <aside className="booking-empty-details" aria-labelledby="booking-empty-title"><div className="booking-empty-symbol"><BookingIcon name="4651a" /></div><h2 id="booking-empty-title">No Venue Selected</h2><p>Select a room from the catalog to view its timetable, current occupancy, and to configure your reservation.</p><button type="button" disabled>Select a Venue to Lock</button></aside>
  const { room, active, entries, windows, status, label } = view
  const current = clockParts(now)
  const upcoming = entries.filter(entry => date !== current.date || entry.end > current.minute)
    .filter(entry => entry !== active && schedules.windows.some(window => (shift === 'all' || shift === window.shift) && overlaps(entry, window)))
  const heading = room.blocked ? label.toUpperCase() : active ? 'CURRENTLY OCCUPIED' : windows.length ? 'AVAILABLE FOR REQUEST' : 'NO AVAILABILITY'
  const occupancyLabel = active ? `${label} · Until ${formatTime(active.end)}` : windows[0] ? `Free ${timeRange(windows[0].start, windows[0].end)}` : label
  return <aside className="booking-details" aria-labelledby="booking-details-title">
    <div className="booking-details-heading"><div><h2 id="booking-details-title">Live Occupancy &amp; Schedule</h2><h3>Room {room.id} · {room.name}</h3><p><BookingIcon name="cb216" />{date === current.date ? `Current Time: ${formatTime(current.minute)}` : formatDate(date, true)} <span>· Campus schedule</span></p></div><span className="booking-live-symbol"><BookingIcon name="e654f" /></span></div>
    <div className={`booking-occupancy ${status}`}><div><strong><i />{heading}</strong><span className={`booking-badge ${status}`}>{occupancyLabel}</span></div><h4>{room.blocked?.reason || active?.title || (windows.length ? 'Available for a reservation request' : 'No future free window in this shift')}</h4><p>{active?.host ? <>Host: <b>{active.host}</b></> : <>Capacity: <b>{room.capacity} Seats</b></>}<span>{active?.type === 'class' ? 'Class' : active ? 'Reservation' : 'Campus venue'}</span></p></div>
    <section className="booking-schedule" aria-label="Upcoming schedule"><h4><BookingIcon name="14887" />Upcoming schedule ({date === current.date ? 'today' : 'selected date'})</h4>
      {windows[0] && <div className="booking-schedule-row free"><time>{timeRange(windows[0].start, windows[0].end)}</time><span>Vacant / Reservation Window</span><small>Free Window</small></div>}
      {upcoming.map(entry => <div className="booking-schedule-row" key={`${entry.start}-${entry.end}`}><time>{timeRange(entry.start, entry.end)}</time><span>{entry.title}</span><small>{entry.type === 'class' ? 'Class' : entry.type === 'reserved' ? 'Reserved' : 'Blocked'}</small></div>)}
      {!upcoming.length && !windows.length && <p className="booking-muted">No remaining slots for this date and shift. Try another date or venue.</p>}
    </section>
    {children}
  </aside>
}
