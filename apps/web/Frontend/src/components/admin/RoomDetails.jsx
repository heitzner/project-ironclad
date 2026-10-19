import AdminDialog from './AdminDialog.jsx'
import { displayDate } from './admin.logic.js'

export default function RoomDetails({ room, bookings, onClose }) {
  const schedule = bookings?.filter(booking => booking.roomId === room.id && booking.status !== 'denied')
  return <AdminDialog title="Live Occupancy & Schedule" description={room.name} onClose={onClose}>
    <dl className="grid grid-cols-2 gap-4 rounded-panel bg-cardBg p-4 text-xs"><div><dt className="text-textMuted">Room</dt><dd className="mt-1 font-semibold">{room.number || room.id}</dd></div><div><dt className="text-textMuted">Occupancy</dt><dd className="mt-1 font-semibold capitalize">{room.occupancy || 'Unknown'}</dd></div><div><dt className="text-textMuted">Capacity</dt><dd className="mt-1 font-semibold">{room.capacity ?? 'Not provided'}</dd></div><div><dt className="text-textMuted">Location</dt><dd className="mt-1 font-semibold">{room.location || 'Not provided'}</dd></div></dl>
    <h3 className="mb-3 mt-5 text-sm font-semibold">Booking schedule</h3>
    {!schedule ? <p className="text-xs text-textSecondary">Schedule service is not connected.</p> : schedule.length === 0 ? <p className="text-xs text-textSecondary">No requests are listed for this room.</p> : <ul className="grid gap-3">{schedule.map(item => <li key={item.id} className="rounded-control bg-selectBg p-3 text-xs leading-6"><p className="font-semibold capitalize">{item.status}</p><p>{displayDate(item.startsAt)} – {displayDate(item.endsAt)}</p><p>{item.requesterName || item.requesterId || 'Requester not provided'}</p></li>)}</ul>}
  </AdminDialog>
}
