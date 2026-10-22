import { Calendar, Clock, MapPin, ShieldCheck, Trophy, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import ModalShell from './ModalShell.jsx'

export function CampaignOverlay({ isOpen, onClose, event }) {
  if (!event) return null

  const isCommittee = event.organizerType === 'committee'

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="venue-details-title"
      maxWidth="max-w-[480px]"
      showTopBar={true}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-cardBg px-2.5 py-0.5 text-[10px] font-semibold text-deep uppercase tracking-wider">
              {event.status || 'Campus Event'}
            </span>
            <h2 id="venue-details-title" className="mt-1.5 text-[18px] font-bold text-textPrimary">
              {event.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-textMuted transition-colors duration-150 hover:bg-pageBg hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-3 rounded-xl bg-selectBg/50 p-4 border border-track/40 text-[13px]">
          <div className="flex items-center gap-2.5 text-textPrimary">
            <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <span className="shrink-0 font-semibold">Venue:</span>
            <span className="min-w-0 flex-1">{event.venue}</span>
          </div>

          <div className="flex items-center gap-2.5 text-textPrimary">
            <Clock className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <span className="shrink-0 font-semibold">Schedule:</span>
            <span className="min-w-0 flex-1">{event.schedule}</span>
          </div>

          <div className="flex items-center gap-2.5 text-textPrimary">
            {isCommittee ? (
              <Trophy className="h-4 w-4 text-dark shrink-0" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-dark shrink-0" aria-hidden="true" />
            )}
            <span className="shrink-0 font-semibold">Organizer:</span>
            <span className="min-w-0 flex-1">{event.organizer}</span>
          </div>
        </div>

        {event.description && (
          <p className="mt-4 text-[13px] leading-5 text-textSecondary">
            {event.description}
          </p>
        )}

        <div className="mt-6 flex flex-col items-stretch justify-between gap-3 border-t border-track/60 pt-4 sm:flex-row sm:items-center">
          <Link
            to="/booking"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dark px-4 py-2 text-[13px] font-semibold text-dark transition-colors duration-150 hover:bg-cardBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>Go to Venue Booking</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl bg-dark px-5 py-2 text-[13px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

export default CampaignOverlay
