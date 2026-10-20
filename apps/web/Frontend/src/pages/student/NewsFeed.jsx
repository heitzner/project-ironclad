import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import CampaignOverlay from '../../components/common/CampaignOverlay.jsx'
import EventCard from '../../components/common/EventCard.jsx'
import PageHeader, { StatusBadge } from '../../components/common/PageHeader.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'
import RegistrationModal from '../../components/common/RegistrationModal.jsx'
import SearchBar from '../../components/common/SearchBar.jsx'
import ProtectedRoute from '../../components/common/ProtectedRoute.jsx'
import ViewState from '../../components/common/ViewState.jsx'
import FeedPreviewNotice from '../../components/common/FeedPreviewNotice.jsx'
import { resourceState } from '../../hooks/resourceState.js'
import useAuth from '../../hooks/useAuth.js'
import useEvents from '../../hooks/useEvents.js'
import { useStudent } from '../../components/student/student.context.js'

export function NewsFeed() {
  const auth = useAuth()
  if (auth.status === 'authenticated' && auth.user?.role === 'admin') return <Navigate to="/admin" replace />
  if (auth.status === 'authenticated' && auth.user?.role === 'council') return <Navigate to="/council" replace />
  return <ProtectedRoute roles={['student']}><StudentNewsFeed /></ProtectedRoute>
}

export function StudentNewsFeed() {
  const student = useStudent()
  const eventsResource = useEvents({ service: student.service })
  return <StudentNewsFeedContent resource={eventsResource} preview={student.preview} />
}

export function StudentNewsFeedContent({ resource, preview = false }) {
  const events = resource.data ?? []
  const viewState = resourceState(resource, events.length === 0)
  const categories = [...new Set(events.flatMap(event => [event.category, ...(event.tags ?? [])]).filter(Boolean))]
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [selectedVenueEvent, setSelectedVenueEvent] = useState(null)
  const [selectedRegisterEvent, setSelectedRegisterEvent] = useState(null)
  const navigate = useNavigate()

  // Filter events by search query and category
  const filteredEvents = events.filter((event) => {
    const matchesQuery =
      !query ||
      [event.title, event.description, event.organizer, event.venue].some(value => value?.toLowerCase().includes(query.trim().toLowerCase()))

    const matchesCategory =
      !category ||
      event.category === category ||
      event.tags?.some((tag) => tag.toLowerCase() === category.toLowerCase())

    return matchesQuery && matchesCategory
  })

  return (
    <PageLayout role="student">
      {preview && <FeedPreviewNotice />}
      <span className="sr-only">Student portal</span>
      {/* Page Header */}
      <PageHeader
        icon={Megaphone}
        title="Campus News Feed & Announcements"
        subtitle="Explore campus initiatives, announcements, and events."
      >
        {!viewState && <StatusBadge variant="green">
          {filteredEvents.length} Active Events
        </StatusBadge>}
      </PageHeader>

      {/* Search and Category Filter Bar */}
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        actionLabel="View More Events"
        onAction={() => navigate('/events')}
      />

      {/* Events Grid */}
      {viewState ? <ViewState state={viewState} onRetry={resource.refetch} /> : filteredEvents.length === 0 ? (
        <div className="rounded-panel bg-white p-12 text-center shadow-card">
          <p className="text-[14px] font-medium text-textSecondary">
            No announcements match your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onViewVenue={(ev) => setSelectedVenueEvent(ev)}
              onRegister={(ev) => setSelectedRegisterEvent(ev)}
            />
          ))}
        </div>
      )}

      {/* Venue Details Modal */}
      <CampaignOverlay
        isOpen={!!selectedVenueEvent}
        event={selectedVenueEvent}
        onClose={() => setSelectedVenueEvent(null)}
      />

      {/* Registration Confirmation Modal */}
      <RegistrationModal
        key={selectedRegisterEvent?.id}
        isOpen={!!selectedRegisterEvent}
        event={selectedRegisterEvent}
        onClose={() => setSelectedRegisterEvent(null)}
        onSuccess={resource.refetch}
      />
    </PageLayout>
  )
}

export default NewsFeed
