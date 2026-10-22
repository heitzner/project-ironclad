import { useEffect, useState } from 'react'
import {
  CalendarClock,
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardList,
  DoorOpen,
} from 'lucide-react'
import AdminShell from '../../components/admin/AdminShell.jsx'
import BookingRequests from '../../components/admin/BookingRequests.jsx'
import { Link } from 'react-router-dom'
import AdminState from '../../components/admin/AdminState.jsx'

export default function AdminDashboard({
  rooms,
  bookings,
  events,
  loading = false,
  error,
  onRetry,
  onDecision,
  summary,
  snapshotComplete = false,
  onCheckStatus,
  ...shell
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  // Undefined means disconnected; an empty array means a real empty response.
  const ready =
    snapshotComplete === true && !loading && !error && Array.isArray(rooms) && Array.isArray(bookings) && Array.isArray(events)
  const metrics = [
    {
      label: 'Pending requests',
      field: 'pendingRequests', to: '/admin/bookings?decision=pending',
      count: ready ? bookings.filter((item) => item.status === 'pending').length : null,
      icon: ClipboardList,
    },
    {
      label: 'Occupied rooms',
      field: 'occupiedRooms', to: '/admin/bookings?occupancy=occupied',
      count: ready ? rooms.filter((item) => item.occupancy === 'occupied').length : null,
      icon: DoorOpen,
    },
    {
      label: 'Scheduled rooms',
      field: 'scheduledRooms', to: '/admin/bookings?decision=approved',
      count: ready
        ? new Set(
            bookings
              .filter((item) => item.status === 'approved' && Date.parse(item.startsAt) > now)
              .map((item) => item.roomId),
          ).size
        : null,
      icon: CalendarClock,
    },
    {
      label: 'Available rooms',
      field: 'availableRooms', to: '/admin/bookings?occupancy=empty',
      count: ready ? rooms.filter((item) => item.occupancy === 'empty').length : null,
      icon: CircleCheck,
    },
    {
      label: 'Denied requests',
      field: 'deniedRequests', to: '/admin/bookings?decision=denied',
      count: ready ? bookings.filter((item) => item.status === 'denied').length : null,
      icon: CircleX,
    },
    {
      label: 'Events',
      field: 'events', to: '/admin/events',
      count: ready ? events.filter((item) => item.status !== 'completed').length : null,
      icon: CalendarDays,
    },
  ]
  return (
    <AdminShell
      {...shell}
      section="dashboard"
      title="Facility Overview"
      subtitle="Monitor campus availability and review booking requests."
    >
      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Facility summary"
      >
        {metrics.map(({ label, count: derived, field, to, icon: Icon }) => {
          const count = loading || error ? null : Number.isSafeInteger(summary?.[field]) && summary[field] >= 0 ? summary[field] : derived
          return (
          <article
            key={label}
            className="flex items-center justify-between gap-4 rounded-panel border border-track border-t-2 border-t-primary bg-white p-5 shadow-card"
          >
            <div className="grid gap-2">
              <h2 className="text-xs font-medium text-textSecondary">{label}</h2>
              <Link to={to} className="flex min-h-11 items-center rounded-control text-xs font-semibold text-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View {label.toLowerCase()}</Link>
              <span
                className="text-3xl font-bold leading-none text-deep"
                aria-label={count === null ? `${label}: count unavailable` : `${label}: ${count}`}
              >
                {count ?? '—'}
              </span>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-panel bg-cardBg text-dark">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
          </article>
        )})}
      </section>
      {!ready && !summary && <AdminState loading={loading} error={error} connected={false} onRetry={onRetry} label="dashboard metrics" />}
      {onRetry && !loading && !error && (ready || summary) && <button type="button" className="admin-secondary self-start" onClick={onRetry}>Refresh dashboard</button>}
      <BookingRequests
        bookings={bookings}
        user={shell.user}
        preview={shell.preview}
        onDecision={onDecision}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onCheckStatus={onCheckStatus}
      />
    </AdminShell>
  )
}
