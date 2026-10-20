import { useState } from 'react'
import AdminDialog from './AdminDialog.jsx'
import { displayDate, isAdmin, validateDecision } from './admin.logic.js'

export default function BookingDecisionDialog({ booking, bookings, decision, user, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event) {
    event.preventDefault()
    if (!isAdmin(user) || !onConfirm || pending) return
    const issue = validateDecision(booking, decision, reason, bookings)
    if (issue) { setError(issue); return }
    setPending(true)
    setError('')
    try {
      await onConfirm(booking.id, { status: decision, reason: reason.trim(), version: booking.version })
      onClose()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The request could not be updated. Refresh and try again.')
    } finally { setPending(false) }
  }
  return <AdminDialog title={decision === 'approved' ? 'Approve booking?' : 'Deny booking?'} description="Confirm the request details before continuing. The server must recheck permission and room availability." onClose={onClose} busy={pending}>
    <dl className="mb-5 grid gap-2 rounded-control bg-pageBg p-4 text-xs leading-6"><div><dt className="font-semibold">Venue</dt><dd>{booking.roomName || booking.roomId}</dd></div><div><dt className="font-semibold">Requested schedule</dt><dd>{displayDate(booking.startsAt)} – {displayDate(booking.endsAt)}</dd></div><div><dt className="font-semibold">Requested by</dt><dd>{booking.requesterName || booking.requesterId || 'Not provided'}</dd></div></dl>
    <form onSubmit={submit} className="grid gap-4">
      <label className="admin-label">{decision === 'denied' ? 'Reason for denial (required)' : 'Note (optional)'}<textarea className="admin-field min-h-24" value={reason} onChange={event => setReason(event.target.value)} required={decision === 'denied'} disabled={pending} maxLength={1000} /></label>
      {error && <p role="alert" className="text-sm text-textPrimary">{error}</p>}
      <div className="flex justify-end gap-2"><button className="admin-secondary" type="button" disabled={pending} onClick={onClose}>Cancel</button><button className="admin-button" disabled={pending || !isAdmin(user) || !onConfirm}>{pending ? 'Saving…' : 'Confirm decision'}</button></div>
    </form>
  </AdminDialog>
}
