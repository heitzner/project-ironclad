import { useEffect, useState } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageLayout from './PageLayout.jsx'
import PageHeader from './PageHeader.jsx'
import { DecisionDialog } from './SystemDialog.jsx'
import { clockParts, timeRange } from '../../features/student-booking/booking.logic.js'
import { roomView } from '../../data/booking-selection.js'
import { primaryButton, secondaryButton } from './system-ui.js'
import eventsTile from '../admin/assets/events-tile.png'

export default function SystemDashboard({ snapshot, store, user }) {
  const [now, setNow] = useState(() => new Date())
  const [decision, setDecision] = useState(null)
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer) }, [])
  const today = clockParts(now).date
  const views = snapshot.rooms.map(room => roomView(room, today, 'all', store.schedules(snapshot, undefined, now), now))
  const pending = snapshot.bookings.filter(b => b.status === 'pending')
  const metrics = [
    ['Pending requests', pending.length], ['Occupied rooms', views.filter(v => v.active && v.active.type !== 'closure').length],
    ['Scheduled rooms', views.filter(v => v.entries.some(e => e.end > clockParts(now).minute && e.type !== 'closure')).length],
    ['Available rooms', views.filter(v => v.status === 'available').length], ['Declined requests', snapshot.bookings.filter(b => b.status === 'declined').length],
    ['Events', snapshot.posts.filter(p => p.kind === 'event' && p.status === 'published' && Date.parse(p.endsAt) > now.getTime()).length],
  ]
  return <PageLayout>
    <PageHeader icon={ChartNoAxesCombined} title="Dashboard" subtitle="Facility overview and booking action center · Current Manila date and time." />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, count]) => <article key={label} className="relative overflow-hidden rounded-card border border-soft bg-white p-5 shadow-card">{label === 'Events' && <img src={eventsTile} alt="" className="absolute inset-y-0 right-0 h-full w-24 object-cover opacity-20" />}<p className="relative text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p><p className="relative mt-3 text-4xl font-bold text-deep">{count}</p></article>)}</div>
    <section className="overflow-hidden rounded-card border border-track bg-white shadow-card"><div className="flex flex-wrap items-center justify-between gap-3 bg-dark p-4 text-white"><h2 className="font-bold">Booking action center</h2><Link to="/admin" className="rounded-control border border-white px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">Rooms & Reservations</Link></div>
      {!pending.length ? <p className="p-8 text-center text-sm text-textSecondary">You’re up to date. No booking requests await approval.</p> : <div role="region" aria-label="Pending reservations" tabIndex={0} className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-cardBg"><tr>{['Room', 'Requested by', 'Date / Time window', 'Confirmation'].map(label => <th scope="col" key={label} className="p-4 text-xs uppercase">{label}</th>)}</tr></thead><tbody>{pending.map(b => <tr key={b.id} className="border-t border-track"><td className="p-4 font-bold">Room {b.roomId}</td><td className="p-4">{b.requesterName}<p className="text-xs text-textSecondary">{b.studentId}</p></td><td className="p-4">{b.date}<p className="text-xs">{timeRange(b.start, b.end)}</p></td><td className="p-4"><div className="flex gap-2"><button type="button" className={primaryButton} onClick={() => setDecision({ booking: b, status: 'approved' })}>Approve</button><button type="button" className={secondaryButton} onClick={() => setDecision({ booking: b, status: 'declined' })}>Decline</button></div></td></tr>)}</tbody></table></div>}
    </section>
    <p className="text-xs leading-6 text-textSecondary">Room counts reflect today’s schedule. A room with a future booking may still have a free window; use Booking to inspect exact times.</p>
    {decision && <DecisionDialog title={decision.status === 'approved' ? 'Approve booking?' : 'Decline booking?'} description={`Room ${decision.booking.roomId} · ${decision.booking.requesterName} · ${decision.booking.date} · ${timeRange(decision.booking.start, decision.booking.end)}`} actionLabel={decision.status === 'approved' ? 'Approve booking' : 'Decline booking'} requireReason={decision.status === 'declined'} onClose={() => setDecision(null)} onConfirm={reason => store.decideBooking(user, decision.booking.id, decision.status, reason)} />}
  </PageLayout>
}
