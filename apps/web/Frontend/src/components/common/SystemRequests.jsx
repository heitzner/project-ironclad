import { useEffect, useState } from 'react'
import { ClipboardList, Building2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageLayout from './PageLayout.jsx'
import PageHeader from './PageHeader.jsx'
import { DecisionDialog } from './SystemDialog.jsx'
import { timeRange } from '../../data/booking-selection.js'
import RoomClosureDialog from './RoomClosureDialog.jsx'
import { HandoverInvitations } from './OrganizationManagement.jsx'
import { dateTimeLabel, inputClass, primaryButton, secondaryButton } from './system-ui.js'
import { clockParts, formatDate } from '../../features/student-booking/booking.logic.js'

function Status({ value }) {
  return <span className="inline-flex rounded-full bg-cardBg px-3 py-1 text-xs font-semibold capitalize text-deep">{value}</span>
}

export function MyParticipation({ snapshot, user, store }) {
  const [filter, setFilter] = useState('all')
  const records = [...snapshot.applications, ...snapshot.registrations, ...snapshot.bookings.map(b => ({ ...b, userId: b.requesterId, kind: 'booking', title: `Room ${b.roomId} · ${b.purpose}` }))]
    .filter(record => record.userId === user.id && (filter === 'all' || record.kind === filter)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return <PageLayout>
    <PageHeader icon={ClipboardList} title="My Activity" subtitle="Track your council applications, event registrations, and room reservations." />
    {store && <HandoverInvitations snapshot={snapshot} user={user} store={store} />}
    <div className="grid gap-3 sm:grid-cols-3">{[['Applications', snapshot.applications.filter(a => a.userId === user.id).length], ['Registrations', snapshot.registrations.filter(r => r.userId === user.id).length], ['Room bookings', snapshot.bookings.filter(b => b.requesterId === user.id).length]].map(([label, count]) => <div key={label} className="rounded-card border border-soft bg-cardBg p-4"><p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p><p className="mt-2 text-3xl font-bold text-deep">{count}</p></div>)}</div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="My participation filters">{[['all', 'All activity'], ['council', 'Council applications'], ['event', 'Event registrations'], ['booking', 'Room bookings']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? primaryButton : secondaryButton} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {!records.length && <div className="rounded-panel bg-white p-8 text-center"><h2 className="font-semibold">No activity yet</h2><p className="mt-2 text-sm text-textSecondary">Your submitted forms and bookings will appear here.</p><Link to="/news-feed" className={`${primaryButton} mt-4`}>Explore the News Feed</Link></div>}
    <div className="grid gap-4 lg:grid-cols-2">{records.map(record => <article key={record.id} className="min-w-0 rounded-card border border-soft border-t-4 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-textSecondary">{record.kind === 'booking' ? 'ROOM BOOKING' : record.kind === 'council' ? 'COUNCIL APPLICATION' : 'EVENT REGISTRATION'}</span><Status value={record.status} /></div>
      <h2 className="mt-3 text-lg font-bold">{record.title}</h2>
      <p className="mt-2 text-sm text-textSecondary">Submitted {dateTimeLabel(record.createdAt)}</p>
      {record.kind === 'booking' && <p className="mt-2 text-sm">{formatDate(record.date, true)} · {timeRange(record.start, record.end)}</p>}
      {record.details?.teamName && <p className="mt-2 text-sm">Team: {record.details.teamName}</p>}
      {record.details?.category && <p className="mt-2 text-sm">Category: {record.details.category}</p>}
      {record.reason && <p className="mt-3 rounded-control bg-selectBg p-3 text-sm">Reviewer note: {record.reason}</p>}
      {record.reviewedBy && <p className="mt-2 text-xs text-textSecondary">Reviewed by {record.reviewedBy} · {dateTimeLabel(record.reviewedAt)}</p>}
      <p className="mt-4 break-all text-xs text-textSecondary">Reference: {record.id}</p>
    </article>)}</div>
  </PageLayout>
}

export function MembershipReview({ snapshot, store, user }) {
  const [status, setStatus] = useState('pending')
  const [query, setQuery] = useState('')
  const [decision, setDecision] = useState(null)
  const applications = snapshot.applications.filter(a => (!status || a.status === status) && `${a.name} ${a.studentId} ${a.title}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <PageLayout>
    <PageHeader icon={Users} title="Council Applications" subtitle="Review student membership requests, read their answers, and record a decision." />
    <div className="grid gap-3 rounded-panel bg-white p-3 sm:grid-cols-[1fr_auto]"><input type="search" aria-label="Search council applications" placeholder="Search name, student ID, or recruitment…" value={query} onChange={e => setQuery(e.target.value)} className={inputClass} /><select aria-label="Application status" value={status} onChange={e => setStatus(e.target.value)} className={inputClass}><option value="pending">Pending review</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="">All applications</option></select></div>
    <p role="status" className="text-sm text-textSecondary">{applications.length} applications shown</p>
    {!applications.length && <p className="rounded-panel bg-white p-8 text-center">No applications match this view.</p>}
    <div className="grid gap-4 lg:grid-cols-2">{applications.map(application => <article key={application.id} className="rounded-panel border border-track bg-white p-5">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-bold">{application.name}</h2><Status value={application.status} /></div>
      <p className="mt-2 text-sm">{application.studentId} · {application.program}</p><p className="mt-1 text-sm text-textSecondary">{application.title}</p><p className="mt-1 text-sm text-textSecondary">{application.details.contact}</p>
      <dl className="mt-4 space-y-3">{application.details.answers.map(({ question, answer }, index) => <div key={index} className="rounded-control bg-pageBg p-3"><dt className="text-sm font-semibold">{question}</dt><dd className="mt-2 whitespace-pre-wrap text-sm text-textSecondary">{answer}</dd></div>)}</dl>
      <p className="mt-3 text-xs text-textSecondary">Submitted {dateTimeLabel(application.createdAt)}</p>
      {application.reason && <p className="mt-3 text-sm">Reviewer note: {application.reason}</p>}
      {application.status === 'pending' && <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={primaryButton} onClick={() => setDecision({ application, status: 'accepted' })}>Accept application</button><button type="button" className={secondaryButton} onClick={() => setDecision({ application, status: 'declined' })}>Decline application</button></div>}
    </article>)}</div>
    {decision && <DecisionDialog title={decision.status === 'accepted' ? 'Accept council application?' : 'Decline council application?'} description={`${decision.application.name} · ${decision.application.title}. This decision will appear in the student’s account.`} requireReason={decision.status === 'declined'} actionLabel={decision.status === 'accepted' ? 'Accept application' : 'Decline application'} onClose={() => setDecision(null)} onConfirm={reason => store.review(user, decision.application.id, decision.status, reason)} />}
  </PageLayout>
}

export function Facilities({ snapshot, store, user }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer) }, [])
  const current = clockParts(now)
  const closures = snapshot.closures.filter(c => c.endDate > current.date || (c.endDate === current.date && c.end > current.minute))
  const [tab, setTab] = useState('requests')
  const [status, setStatus] = useState('pending')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const bookings = snapshot.bookings.filter(b => (!status || b.status === status) && `${b.roomId} ${b.requesterName} ${b.studentId} ${b.purpose}`.toLowerCase().includes(query.trim().toLowerCase()))
  const rooms = snapshot.rooms.filter(room => `Room ${room.id} ${room.name} ${room.location}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <PageLayout>
    <PageHeader icon={Building2} title="Rooms & Reservations" subtitle="Review reservations and schedule when rooms are closed for booking." />
    <div className="grid gap-3 sm:grid-cols-3">{[['Pending approval', snapshot.bookings.filter(b => b.status === 'pending').length], ['Campus rooms', snapshot.rooms.length], ['Scheduled closures', closures.length]].map(([label, count]) => <div key={label} className="rounded-card border border-soft bg-cardBg p-4"><p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p><p className="mt-2 text-3xl font-bold text-deep">{count}</p></div>)}</div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Room management views"><button type="button" aria-pressed={tab === 'requests'} className={tab === 'requests' ? primaryButton : secondaryButton} onClick={() => { setTab('requests'); setQuery('') }}>Booking requests · {snapshot.bookings.filter(b => b.status === 'pending').length}</button><button type="button" aria-pressed={tab === 'rooms'} className={tab === 'rooms' ? primaryButton : secondaryButton} onClick={() => { setTab('rooms'); setQuery('') }}>Room Booking Access · {snapshot.rooms.length}</button></div>
    <div className="grid gap-3 rounded-panel bg-white p-3 sm:grid-cols-[1fr_auto]"><input type="search" aria-label={tab === 'requests' ? 'Search booking requests' : 'Search rooms'} placeholder={tab === 'requests' ? 'Search room, requester, or purpose…' : 'Search rooms…'} value={query} onChange={e => setQuery(e.target.value)} className={inputClass} />{tab === 'requests' && <select aria-label="Booking request status" className={inputClass} value={status} onChange={e => setStatus(e.target.value)}><option value="pending">Pending approval</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="">All requests</option></select>}</div>
    {tab === 'requests' ? <>
      <p role="status" className="text-sm text-textSecondary">{bookings.length} requests shown</p>
      {!bookings.length && <p className="rounded-panel bg-white p-8 text-center">No booking requests match this view.</p>}
      <div className="grid gap-4 lg:grid-cols-2">{bookings.map(booking => <article key={booking.id} className="rounded-panel border border-track bg-white p-5">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-bold">Room {booking.roomId}</h2><Status value={booking.status} /></div>
        <p className="mt-2 text-sm">{booking.purpose}</p><p className="mt-2 text-sm text-textSecondary">{booking.requesterName} · {booking.studentId}</p><p className="mt-3 text-sm font-semibold">{formatDate(booking.date, true)} · {timeRange(booking.start, booking.end)}</p>
        <p className="mt-3 break-all text-xs text-textSecondary">Reference: {booking.id}</p>{booking.reason && <p className="mt-3 text-sm">Reviewer note: {booking.reason}</p>}
        {booking.status === 'pending' && <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={primaryButton} onClick={() => setDialog({ type: 'approve', booking })}>Approve booking</button><button type="button" className={secondaryButton} onClick={() => setDialog({ type: 'decline', booking })}>Decline booking</button></div>}
      </article>)}</div>
    </> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{!rooms.length && <p>No rooms match your search.</p>}{rooms.map(room => <article key={room.id} className="rounded-panel border border-track bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold">Room {room.id}</h2><Status value={room.blocked ? 'Closed until reopened' : closures.some(c => c.roomId === room.id) ? 'Scheduled closure' : 'Open for booking'} /></div><p className="mt-3 text-sm font-semibold">{room.name}</p><p className="mt-2 text-sm text-textSecondary">{room.location} · {room.capacity} seats</p>{room.blocked && <p className="mt-3 text-sm">{room.blocked.reason}</p>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" className={secondaryButton} onClick={() => setDialog({ type: 'schedule', room })}>Schedule closure</button>{(room.blocked || closures.some(c => c.roomId === room.id)) && <button type="button" className={primaryButton} onClick={() => setDialog({ type: 'open', room })}>Reopen room now</button>}</div><ul className="mt-3 space-y-2 text-xs text-textSecondary">{closures.filter(c => c.roomId === room.id).map(c => <li key={c.id} className="rounded-control bg-cardBg p-2">{c.startDate}{c.endDate !== c.startDate && ` → ${c.endDate}`} · {c.mode === 'interval' ? timeRange(c.start, c.end) : c.mode === 'week' ? 'Whole week' : 'Whole day'}<p className="mt-1">{c.reason}</p></li>)}</ul></article>)}</div>}
    {dialog?.type === 'schedule' && <RoomClosureDialog room={dialog.room} snapshot={snapshot} store={store} user={user} onClose={() => setDialog(null)} />}
    {dialog && dialog.type !== 'schedule' && <DecisionDialog title={{ approve: 'Approve room booking?', decline: 'Decline room booking?', block: 'Mark room unavailable?', open: 'Open room for booking?' }[dialog.type]} description={dialog.booking ? `Room ${dialog.booking.roomId} · ${dialog.booking.requesterName} · ${timeRange(dialog.booking.start, dialog.booking.end)}. The requester will see your decision in their account.` : `Room ${dialog.room.id} · ${dialog.room.name}. This removes every scheduled closure and reopens booking immediately for every account. Existing reservations remain in place.`} actionLabel={{ approve: 'Approve booking', decline: 'Decline booking', block: 'Mark unavailable', open: 'Open for booking' }[dialog.type]} requireReason={['decline', 'block'].includes(dialog.type)} onClose={() => setDialog(null)} onConfirm={reason => dialog.booking ? store.decideBooking(user, dialog.booking.id, dialog.type === 'approve' ? 'approved' : 'declined', reason) : store.reopenRoom(user, dialog.room.id)} />}
  </PageLayout>
}
