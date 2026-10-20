import { useState } from 'react'
import {
  ArrowRight,
  Clock,
  Image as ImageIcon,
  Map,
  MapPin,
  ShieldCheck,
  Trophy,
} from 'lucide-react'
import ProgressBar from './ProgressBar.jsx'

export function EventCard({
  event,
  onViewVenue,
  onRegister,
}) {
  const [imageError, setImageError] = useState(false)

  const hasCounts = Number.isInteger(event.registered) && Number.isInteger(event.capacity)
  const registered = event.registered
  const capacity = event.capacity
  const pct = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0
  const isFull = capacity > 0 && registered >= capacity

  const isInstitutional = event.status === 'Institutional Event'
  const statusBg = isInstitutional ? 'bg-dark' : 'bg-primary'

  const isCommittee = event.organizerType === 'committee'

  return (
    <article className="flex flex-col min-h-[441px] rounded-2xl bg-cardBg shadow-card overflow-hidden">
      {/* Media */}
      <div className="relative h-[208px] w-full bg-surfaceGray">
        {!imageError && event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-textMuted bg-surfaceGray">
            <ImageIcon className="h-10 w-10 opacity-40" aria-hidden="true" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden="true" />

        {/* Status pill top-left */}
        {event.status && (
          <span
            className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase leading-[14px] tracking-[0.5px] text-white shadow-card ${statusBg}`}
          >
            {event.status}
          </span>
        )}

        {/* Bottom row chips */}
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
          {event.venue && (
            <span className="flex items-center gap-1 rounded-chip bg-black/40 px-2 py-0.5 text-[10px] font-medium leading-[14px] tracking-[0.5px] text-white backdrop-blur-[2px]">
              <MapPin className="h-3 w-3 text-ring shrink-0" aria-hidden="true" />
              <span className="truncate">{event.venue}</span>
            </span>
          )}

          {event.schedule && (
            <span className="flex items-center gap-1 rounded-chip bg-primary/80 px-2 py-0.5 text-[10px] font-semibold leading-[14px] text-white backdrop-blur-[2px]">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{event.schedule}</span>
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between p-4 gap-2">
        <div>
          {/* Tags */}
          {Array.isArray(event.tags) && event.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              {event.tags.map((tag, idx) => {
                let tagClass = 'bg-white text-textSecondary font-medium'
                if (idx === 0) tagClass = 'bg-white text-primary font-bold'
                else if (idx === 1) tagClass = 'bg-soft/20 text-deep font-semibold'

                return (
                  <span
                    key={`${tag}-${idx}`}
                    className={`rounded-full px-2 py-0.5 text-[10px] leading-[14px] tracking-[0.5px] ${tagClass}`}
                  >
                    {tag}
                  </span>
                )
              })}
            </div>
          )}

          <h2 className="pt-0.5 text-[16px] font-bold leading-[22px] text-textPrimary">
            {event.title}
          </h2>

          <p className="mt-1 text-[13px] leading-[20px] text-textSecondary line-clamp-3">
            {event.description}
          </p>
        </div>

        {/* Metric block */}
        <div className="pt-2 flex flex-col gap-1">
          {hasCounts ? <><div className="flex items-center justify-between text-[10px] leading-[14px]">
            <span className="font-semibold text-deep">
              {event.metricLabel || 'Participant Slots'}: {registered}/{capacity}{' '}
              {event.unitLabel || 'Registered'}
            </span>
            <span className="font-medium text-dark">
              {pct}% {event.capLabelType || 'Cap'}
            </span>
          </div>

          <ProgressBar value={pct} label={`${event.title}: ${registered} of ${capacity} registered`} /></> : <p className="text-xs text-textSecondary">Registration counts not provided.</p>}

          <div className="flex items-center gap-1 pt-1 text-[10px] leading-[14px] text-textSecondary">
            {isCommittee ? (
              <Trophy className="h-2.5 w-2.5 text-dark shrink-0" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-2.5 w-2.5 text-dark shrink-0" aria-hidden="true" />
            )}
            <span>
              Organizer: <span className="font-medium">{event.organizer}</span>
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap gap-2 items-center justify-between border-t border-deep/10 pt-2 mt-1">
          <button
            type="button"
            onClick={() => onViewVenue?.(event)}
            className="flex min-h-11 items-center gap-1 rounded-lg bg-soft px-3.5 py-1.5 text-[11px] font-semibold leading-4 tracking-[0.44px] text-textPrimary transition-colors duration-150 hover:bg-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Map className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>View Venue Details</span>
          </button>

          <button
            type="button"
            onClick={() => onRegister?.(event)}
            disabled={isFull}
            className="flex min-h-11 items-center gap-1 rounded-lg bg-primary px-4 py-1.5 text-[11px] font-semibold leading-4 text-white shadow-card transition-colors duration-150 hover:bg-dark disabled:cursor-not-allowed disabled:bg-track disabled:text-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>{isFull ? 'Fully Booked' : event.actionLabel || 'Register'}</span>
            {!isFull && <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </article>
  )
}

export default EventCard
