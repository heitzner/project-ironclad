import { useState } from 'react'
import AdminState from './AdminState.jsx'
import AdminTable from './AdminTable.jsx'
import BookingDecisionDialog from './BookingDecisionDialog.jsx'
import { displayDate, isAdmin } from './admin.logic.js'

export default function BookingRequests({ bookings, allBookings = bookings, user, preview = false, onDecision, loading, error, onRetry }) {
  const [selection, setSelection] = useState(null)
  const [notice, setNotice] = useState('')
  const canEdit = !preview && isAdmin(user) && Boolean(onDecision)
  return <section aria-labelledby="onboarding-title" className="min-w-0 rounded-panel bg-white shadow-card">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-panel border-b border-track px-4 py-4"><h2 id="onboarding-title" className="text-sm font-semibold text-textPrimary">Booking requests</h2><span className="rounded-full bg-cardBg px-3 py-1 text-[10px] font-medium text-dark">Review &amp; approval</span></div>
    {notice && <p role="status" className="px-4 py-3 text-xs text-dark">{notice}</p>}
    <AdminTable label="Booking requests" columns={['Room no.', 'Status', 'Request from', 'Time window', 'Confirmation']} emptyState={loading || error || !bookings || bookings.length === 0 ? <AdminState label="booking requests" loading={loading} error={error} connected={Boolean(bookings)} empty={!bookings?.length} onRetry={onRetry} /> : undefined}>
      {loading || error || !bookings || bookings.length === 0 ? null : bookings.map(booking => <tr key={booking.id} className="even:bg-cardBg/60">
        <td className="admin-cell font-semibold">{booking.roomName || booking.roomId}</td>
        <td className="admin-cell"><span className="rounded-full bg-selectBg px-3 py-1 text-[10px] font-semibold uppercase">{booking.status}</span></td>
        <td className="admin-cell">{booking.requesterName || booking.requesterId || 'Not provided'}</td>
        <td className="admin-cell text-[10px] leading-5">{displayDate(booking.startsAt)}<br />{displayDate(booking.endsAt)}</td>
        <td className="admin-cell"><div className="flex gap-2"><button type="button" className="admin-button" disabled={!canEdit || booking.status !== 'pending'} onClick={() => setSelection({ booking, decision: 'approved' })} aria-label={`Approve ${booking.roomName || booking.roomId}`}>Approve</button><button type="button" className="admin-secondary" disabled={!canEdit || booking.status !== 'pending'} onClick={() => setSelection({ booking, decision: 'denied' })} aria-label={`Deny ${booking.roomName || booking.roomId}`}>Deny</button></div></td>
      </tr>)}
    </AdminTable>
    {selection && <BookingDecisionDialog {...selection} bookings={allBookings} user={user} onConfirm={onDecision ? async (...args) => { await onDecision(...args); setNotice('The booking decision was saved.'); } : undefined} onClose={() => setSelection(null)} />}
  </section>
}
