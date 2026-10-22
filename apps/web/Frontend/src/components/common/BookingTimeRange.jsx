import { customTimeOptions } from '../../data/booking-selection.js'
import { formatTime, timeRange } from '../../features/student-booking/booking.logic.js'
import { ThemedSelect } from './ThemedControls.jsx'

export default function BookingTimeRange({ view, draft, busy, onChange }) {
  const options = customTimeOptions(view.windows, draft.from)
  const asOptions = (values, placeholder) => [{ value: '', label: placeholder }, ...values.map(m => ({ value: String(m), label: formatTime(m) }))]
  return <section className="rounded-panel border border-soft bg-pageBg p-4" aria-label="Choose a specific booking time">
    <h4 className="text-sm font-bold text-deep">Choose your time</h4><p className="mt-1 text-xs leading-5 text-textSecondary">Select From and To in 15-minute steps, or choose a suggested duration below. Times cannot cross an occupied period.</p>
    <div className="mt-3 grid grid-cols-2 gap-3"><div><p className="mb-1 text-xs font-semibold">From</p><ThemedSelect label="Booking time From" value={draft.from || ''} options={asOptions(options.starts, 'Start time')} disabled={busy || !options.starts.length} onChange={from => onChange({ from })} /></div><div><p className="mb-1 text-xs font-semibold">To</p><ThemedSelect label="Booking time To" value={draft.to || ''} options={asOptions(options.ends, 'End time')} disabled={busy || !options.ends.length} onChange={to => onChange({ to })} /></div></div>
    <p className="mt-3 text-xs leading-5 text-textSecondary">Free intervals: {view.windows.length ? view.windows.map(w => timeRange(w.start, w.end)).join(' · ') : 'None on this date and shift'}</p>
  </section>
}
