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

export default function AdminDashboard({
  rooms,
  bookings,
  events,
  loading = false,
  error,
  onRetry,
  onDecision,
  ...shell
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  // Undefined means disconnected; an empty array means a real empty response.
  const ready =
    !loading && !error && Array.isArray(rooms) && Array.isArray(bookings) && Array.isArray(events)
  const metrics = [
    {
      label: 'Pending requests',
      count: ready ? bookings.filter((item) => item.status === 'pending').length : null,
      icon: ClipboardList,
    },
    {
      label: 'Occupied rooms',
      count: ready ? rooms.filter((item) => item.occupancy === 'occupied').length : null,
      icon: DoorOpen,
    },
    {
      label: 'Scheduled rooms',
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
      count: ready ? rooms.filter((item) => item.occupancy === 'empty').length : null,
      icon: CircleCheck,
    },
    {
      label: 'Denied requests',
      count: ready ? bookings.filter((item) => item.status === 'denied').length : null,
      icon: CircleX,
    },
    {
      label: 'Events',
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
        {metrics.map(({ label, count, icon: Icon }) => (
          <article
            key={label}
            className="flex items-center justify-between gap-4 rounded-panel border border-track border-t-2 border-t-primary bg-white p-5 shadow-card"
          >
            <div className="grid gap-2">
              <h2 className="text-xs font-medium text-textSecondary">{label}</h2>
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
        ))}
      </section>
      <BookingRequests
        bookings={bookings}
        user={shell.user}
        preview={shell.preview}
        onDecision={onDecision}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
    </AdminShell>
  )
}
