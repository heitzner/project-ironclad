import { useState } from 'react'
import AdminDialog from './AdminDialog.jsx'
import { displayDate, isAdmin, validateDecision } from './admin.logic.js'
import useAdminMutation from './useAdminMutation.js'
import AdminMutationFeedback from './AdminMutationFeedback.jsx'

export default function BookingDecisionDialog({ booking, bookings, decision, user, onConfirm, onClose, onRefresh, onCheckStatus }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const mutation = useAdminMutation({ key: `booking:${booking.id}`, callback: onConfirm, onRefresh, onCheckStatus })
  const pending = mutation.pending || mutation.checking
  async function submit(event) {
    event.preventDefault()
    if (!isAdmin(user) || !onConfirm || mutation.blocked) return
    const issue = validateDecision(booking, decision, reason, bookings)
    if (issue) { setError(issue); return }
    setError('')
    await mutation.run([booking.id, { status: decision, reason: reason.trim(), version: booking.version }], result => result?.id === booking.id && result?.status === decision)
  }
  return <AdminDialog title={decision === 'approved' ? 'Approve booking?' : 'Deny booking?'} description="Confirm the request details before continuing. The server must recheck permission and room availability." onClose={onClose} busy={pending}>
    <dl className="mb-5 grid gap-2 rounded-control bg-pageBg p-4 text-xs leading-6"><div><dt className="font-semibold">Venue</dt><dd>{booking.roomName || booking.roomId}</dd></div><div><dt className="font-semibold">Requested schedule</dt><dd>{displayDate(booking.startsAt)} – {displayDate(booking.endsAt)}</dd></div><div><dt className="font-semibold">Requested by</dt><dd>{booking.requesterName || booking.requesterId || 'Not provided'}</dd></div></dl>
    <form onSubmit={submit} className="grid gap-4">
      <label className="admin-label">{decision === 'denied' ? 'Reason for denial (required)' : 'Note (optional)'}<textarea className="admin-field min-h-24" value={reason} onChange={event => setReason(event.target.value)} required={decision === 'denied'} disabled={mutation.blocked} maxLength={1000} /></label>
      {error && <p role="alert" className="text-sm text-textPrimary">{error}</p>}
      <AdminMutationFeedback mutation={mutation} onRefresh={onRefresh} onCheckStatus={onCheckStatus} />
      <div className="flex flex-wrap justify-end gap-2"><button className="admin-secondary" type="button" disabled={pending} onClick={onClose}>{mutation.outcome ? 'Done' : 'Cancel'}</button><button className="admin-button" disabled={mutation.blocked || !isAdmin(user) || !onConfirm}>{pending ? 'Saving…' : 'Confirm decision'}</button></div>
    </form>
  </AdminDialog>
}
