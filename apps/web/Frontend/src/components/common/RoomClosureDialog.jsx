import { timeOptions } from '../../data/time-options.js'
import { useRef, useState } from 'react'
import SystemDialog from './SystemDialog.jsx'
import { DateField, ThemedSelect } from './ThemedControls.jsx'
import { clockParts } from '../../features/student-booking/booking.logic.js'
import { inputClass, primaryButton, secondaryButton } from './system-ui.js'

export default function RoomClosureDialog({ room, snapshot, store, user, onClose }) {
  const [mode, setMode] = useState('interval')
  const [date, setDate] = useState(clockParts().date)
  const [start, setStart] = useState('480')
  const [end, setEnd] = useState('600')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const guard = useRef(false)
  const closures = snapshot.closures.filter(c => c.roomId === room.id)
  return <SystemDialog title={`Room ${room.id} · Booking access`} onClose={onClose} busy={busy}>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); if (guard.current) return; guard.current = true
      setBusy(true); setError('')
      try { await store.scheduleClosure(user, { roomId: room.id, mode, date, start, end, reason: new FormData(event.currentTarget).get('reason') }); onClose() } catch (failure) { setError(failure.message) } finally { guard.current = false; setBusy(false) }
    }}>
      <p className="text-sm leading-6 text-textSecondary">Close this room for a specific period or until you reopen it. Existing reservations remain visible for review. You can reopen it at any time.</p>
      <div><p className="mb-1 text-sm font-semibold">Closure duration</p><ThemedSelect label="Closure duration" value={mode} onChange={setMode} options={[{ value: 'interval', label: 'Specific time frame' }, { value: 'day', label: 'Whole day' }, { value: 'week', label: 'Whole week · 7 days' }, { value: 'indefinite', label: 'Until reopened' }]} /></div>
      {mode !== 'indefinite' && <DateField label={mode === 'week' ? 'Week starts on' : 'Closure date'} value={date} onChange={setDate} min={clockParts().date} />}
      {mode === 'interval' && <div className="grid grid-cols-2 gap-3"><div><p className="mb-1 text-sm font-semibold">From</p><ThemedSelect label="Closure time From" value={start} onChange={value => { setStart(value); if (Number(end) <= Number(value)) setEnd(String(Number(value) + 15)) }} options={timeOptions()} /></div><div><p className="mb-1 text-sm font-semibold">To</p><ThemedSelect label="Closure time To" value={end} onChange={setEnd} options={timeOptions(Number(start) + 15, 1440).map(o => o.value === '1440' ? { value: '1440', label: 'Midnight · end of day' } : o)} /></div></div>}
      {['day', 'week'].includes(mode) && <p className="rounded-control bg-cardBg p-3 text-xs leading-5">{mode === 'day' ? 'Closed from midnight to midnight on this date.' : 'Closed for seven consecutive calendar days, starting on the selected date.'} Time-frame controls are hidden for this duration.</p>}
      <label className="block text-sm font-semibold">Reason<textarea name="reason" required maxLength={500} className={`${inputClass} mt-1`} placeholder="Maintenance, department activity, or another closure reason" /></label>
      {closures.length > 0 && <div className="rounded-panel bg-pageBg p-3 text-xs leading-6"><p className="font-bold">Scheduled closures</p>{closures.map(c => <p key={c.id}>{c.startDate}{c.endDate !== c.startDate && ` → ${c.endDate}`} · {c.reason}</p>)}</div>}
      {error && <p role="alert" className="text-sm">{error}</p>}<div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} className={secondaryButton} onClick={onClose}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Scheduling…' : 'Schedule closure'}</button></div>
    </form>
  </SystemDialog>
}
