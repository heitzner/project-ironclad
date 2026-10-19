import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ChevronDown,
  Image as ImageIcon,
  MapPin,
  RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PageLayout from '../../components/common/PageLayout.jsx'
import CampaignOverlay from '../../components/common/CampaignOverlay.jsx'
import RegistrationModal from '../../components/common/RegistrationModal.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import ViewState from '../../components/common/ViewState.jsx'
import { resourceState } from '../../hooks/resourceState.js'
import useEvents from '../../hooks/useEvents.js'

export function AllEvents() {
  const eventsResource = useEvents()
  const { data, refetch } = eventsResource
  const events = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const viewState = resourceState(eventsResource, events.length === 0)
  const [organizerFilter, setOrganizerFilter] = useState('')
  const [venueFilter, setVenueFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedOverlayEvent, setSelectedOverlayEvent] = useState(null)
  const [selectedRegisterEvent, setSelectedRegisterEvent] = useState(null)
  const [imageErrors, setImageErrors] = useState({})

  const pageSize = 6

  // Client-side filtering
  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      if (organizerFilter && !item.organizer?.toLowerCase().includes(organizerFilter.toLowerCase())) {
        return false
      }
      if (
        venueFilter &&
        !item.venue?.toLowerCase().includes(venueFilter.toLowerCase()) &&
        !item.venueChip?.toLowerCase().includes(venueFilter.toLowerCase())
      ) {
        return false
      }
      if (dateFilter && !item.schedule?.toLowerCase().includes(dateFilter.toLowerCase())) {
        return false
      }
      return true
    })
  }, [events, organizerFilter, venueFilter, dateFilter])

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize))

  // Paginated items
  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredEvents.slice(start, start + pageSize)
  }, [filteredEvents, page, pageSize])

  const handleResetFilters = () => {
    setOrganizerFilter('')
    setVenueFilter('')
    setDateFilter('')
    setPage(1)
  }

  const handleImageError = (id) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }))
  }

  // Reload from the API after a registration so counts stay server-confirmed
  const handleRegistrationSuccess = () => {
    refetch()
  }

  // Available filter options
  const organizerOptions = useMemo(() => {
    const orgs = new Set(events.map((e) => e.organizer).filter(Boolean))
    return Array.from(orgs)
  }, [events])

  const venueOptions = useMemo(() => {
    const venues = new Set(events.map((e) => e.venue).filter(Boolean))
    return Array.from(venues)
  }, [events])

  const dateOptions = useMemo(() => {
    const dates = new Set(events.map((e) => e.schedule?.split('•')[0]?.trim()).filter(Boolean))
    return Array.from(dates)
  }, [events])

  return (
    <PageLayout role="student">
      {/* Top Header and Breadcrumb */}
      <div className="flex flex-col gap-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px]">
          <Link
            to="/"
            className="rounded-full bg-cardBg px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-[0.5px] transition-colors hover:bg-cardBg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            IronClad Portal
          </Link>
          <span className="text-textMuted select-none">/</span>
          <span className="font-medium text-textSecondary">
            Campaigns & Events Directory
          </span>
        </nav>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-1">
          <div>
            <h1 className="text-[28px] lg:text-[30px] font-bold tracking-tight text-textPrimary leading-tight">
              All Campus Campaigns & Events
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-textSecondary">
              Explore student organization initiatives, academic symposiums, sports tryouts, and campus activities across UCC.
            </p>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12px] text-textSecondary shadow-card border border-track/40">
              <span className="h-2.5 w-2.5 rounded-full bg-dark" aria-hidden="true" />
              <span>
                Showing <strong className="font-bold text-textPrimary">{filteredEvents.length}</strong> Active Events
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <section
        aria-label="Filter events"
        className="rounded-2xl bg-white p-3.5 shadow-card border border-track/40"
      >
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Organizer Filter */}
          <div className="relative h-11 w-full md:flex-1 shrink-0">
            <select
              value={organizerFilter}
              onChange={(e) => {
                setOrganizerFilter(e.target.value)
                setPage(1)
              }}
              aria-label="Filter by Organizer"
              className="h-full w-full appearance-none rounded-xl border border-track/40 bg-selectBg/60 px-4 pr-10 text-[13px] font-medium text-textPrimary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Filter by Organizer</option>
              {organizerOptions.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" aria-hidden="true" />
          </div>

          {/* Venue Filter */}
          <div className="relative h-11 w-full md:flex-1 shrink-0">
            <select
              value={venueFilter}
              onChange={(e) => {
                setVenueFilter(e.target.value)
                setPage(1)
              }}
              aria-label="Filter by Venue"
              className="h-full w-full appearance-none rounded-xl border border-track/40 bg-selectBg/60 px-4 pr-10 text-[13px] font-medium text-textPrimary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Filter by Venue</option>
              {venueOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" aria-hidden="true" />
          </div>

          {/* Date Filter */}
          <div className="relative h-11 w-full md:flex-1 shrink-0">
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setPage(1)
              }}
              aria-label="Select Date"
              className="h-full w-full appearance-none rounded-xl border border-track/40 bg-selectBg/60 px-4 pr-10 text-[13px] font-medium text-textPrimary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select Date</option>
              {dateOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" aria-hidden="true" />
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex h-11 w-full md:w-auto shrink-0 items-center justify-center gap-2 rounded-xl border border-track/40 bg-selectBg/70 px-5 text-[13px] font-semibold text-textPrimary shadow-sm transition-colors duration-150 hover:bg-pageBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <RotateCcw className="h-4 w-4 text-textSecondary" aria-hidden="true" />
            <span>Reset Filters</span>
          </button>
        </div>
      </section>

      {/* Events Container Styled from Figma CSS:
          background: linear-gradient(0deg, #FBF9F8, #FBF9F8), #FFFFFF;
      */}
      <div
        className="rounded-3xl p-4 sm:p-6 shadow-sm border border-track/30"
        style={{
          background: 'linear-gradient(0deg, #FBF9F8, #FBF9F8), #FFFFFF',
        }}
      >
        {viewState ? (
          <ViewState
            state={viewState}
            description={viewState === 'empty' ? 'There are no campus campaigns or events yet.' : undefined}
            onRetry={refetch}
          />
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-card">
            <p className="text-[14px] font-medium text-textSecondary">
              No campus campaigns or events match the selected filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-dark"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedEvents.map((event) => {
              const hasImgError = imageErrors[event.id]
              const tags = Array.isArray(event.tags) ? event.tags : [event.category].filter(Boolean)
              const firstTag = tags[0]
              const secondTag = tags[1]

              return (
                <article
                  key={event.id}
                  className="flex flex-col rounded-2xl bg-cardBg shadow-card border border-track/30 overflow-hidden transition-transform duration-150 hover:-translate-y-0.5"
                >
                  {/* Media Banner */}
                  <div className="relative h-[200px] w-full bg-surfaceGray overflow-hidden">
                    {!hasImgError && event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        onError={() => handleImageError(event.id)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-textMuted bg-surfaceGray">
                        <ImageIcon className="h-10 w-10 opacity-40" aria-hidden="true" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0) 100%)',
                      }}
                    />

                    {/* Top-left Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      {firstTag && (
                        <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold tracking-[0.5px] text-white shadow-sm">
                          {firstTag}
                        </span>
                      )}
                      {secondTag && (
                        <span className="rounded-full bg-black/60 backdrop-blur-[2px] px-2.5 py-1 text-[10px] font-semibold tracking-[0.5px] text-white">
                          {secondTag}
                        </span>
                      )}
                    </div>

                    {/* Bottom-right Open Slots / Status Badge */}
                    <div className="absolute right-3 bottom-3">
                      <span className="rounded bg-black/60 backdrop-blur-[2px] px-2 py-0.5 text-[10px] font-medium tracking-[0.5px] text-white">
                        {event.badge || (event.registered < event.capacity ? 'Open Slots' : 'Full')}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <h2 className="text-[17px] font-bold text-textPrimary leading-snug">
                        {event.title}
                      </h2>

                      <p className="mt-2 text-[12px] leading-relaxed text-textSecondary">
                        Organizer: <span className="font-medium text-textPrimary">{event.organizer}</span> | Venue:{' '}
                        <span className="font-medium text-textPrimary">{event.venue}</span>
                      </p>
                    </div>

                    {/* Action Row */}
                    <div className="mt-5 flex items-center justify-between pt-4 border-t border-[rgba(14,59,41,0.08)]">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-textPrimary">
                        <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                        <span className="truncate">{event.venueChip || event.venue}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOverlayEvent(event)}
                          className="inline-flex items-center gap-1 rounded-xl bg-soft px-3 py-1.5 text-[11px] font-semibold text-deep shadow-sm transition-colors duration-150 hover:bg-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                        >
                          Details
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedRegisterEvent(event)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                        >
                          <span>{event.actionLabel || 'Register'}</span>
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Pagination matching Figma & user specification */}
        {!viewState && totalPages > 1 && (
          <div className="mt-8 flex justify-center pt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(next) => setPage(Math.min(totalPages, Math.max(1, next)))}
            />
          </div>
        )}
      </div>

      {/* Campaign Details Overlay */}
      <CampaignOverlay
        isOpen={!!selectedOverlayEvent}
        event={selectedOverlayEvent}
        onClose={() => setSelectedOverlayEvent(null)}
      />

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={!!selectedRegisterEvent}
        event={selectedRegisterEvent}
        onClose={() => setSelectedRegisterEvent(null)}
        onSuccess={handleRegistrationSuccess}
      />
    </PageLayout>
  )
}

export default AllEvents
