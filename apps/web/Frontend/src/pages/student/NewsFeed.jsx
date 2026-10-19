import { useState } from 'react'
import { DoorOpen, Megaphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CampaignOverlay from '../../components/common/CampaignOverlay.jsx'
import EventCard from '../../components/common/EventCard.jsx'
import PageHeader, { StatusBadge } from '../../components/common/PageHeader.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'
import RegistrationModal from '../../components/common/RegistrationModal.jsx'
import SearchBar from '../../components/common/SearchBar.jsx'

// Static dummy events data matching UCC student portal designs
const INITIAL_EVENTS = [
  {
    id: 'evt-1',
    status: 'Confirmed Campaign',
    imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
    venue: 'Social Hall',
    schedule: 'This Thursday • 1:00 PM - 3:00 PM',
    tags: ['Sports', 'Tryouts', 'CSD'],
    category: 'Sports',
    title: 'Badminton Tryouts',
    description:
      'Showcase your agility and court skills! Join the official badminton team tryouts. Open to all CSD students aiming to represent the department in the upcoming university intramurals.',
    registered: 24,
    capacity: 40,
    capLabelType: 'Cap',
    metricLabel: 'Participant Slots',
    unitLabel: 'Registered',
    organizer: 'UCC - North Computer Science Council',
    organizerType: 'council',
    actionLabel: 'Secure Tryout Slot',
  },
  {
    id: 'evt-2',
    status: 'Institutional Event',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    venue: 'CSD ComLab 1',
    schedule: 'Next Friday • 9:00 AM - 5:00 PM',
    tags: ['Esports', 'CSD Fair', 'Gaming'],
    category: 'Esports',
    title: 'Valorant Esports Tournament',
    description:
      'Assemble your squad and dominate the servers. Compete in the annual CSD Fair Valorant Tournament for a chance to win exclusive department merchandise and the championship title.',
    registered: 12,
    capacity: 16,
    capLabelType: 'Filled',
    metricLabel: 'Registered Teams',
    unitLabel: 'Bracket Slots',
    organizer: 'CSD Fair Committee',
    organizerType: 'committee',
    actionLabel: 'Register Team',
  },
]

const CATEGORIES = ['Sports', 'Esports', 'Academic', 'Hackathons']

export function NewsFeed() {
  const [events, setEvents] = useState(INITIAL_EVENTS)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [selectedVenueEvent, setSelectedVenueEvent] = useState(null)
  const [selectedRegisterEvent, setSelectedRegisterEvent] = useState(null)
  const navigate = useNavigate()

  // Filter events by search query and category
  const filteredEvents = events.filter((event) => {
    const matchesQuery =
      !query ||
      event.title.toLowerCase().includes(query.toLowerCase()) ||
      event.description.toLowerCase().includes(query.toLowerCase()) ||
      event.organizer.toLowerCase().includes(query.toLowerCase()) ||
      event.venue.toLowerCase().includes(query.toLowerCase())

    const matchesCategory =
      !category ||
      event.category === category ||
      event.tags.some((tag) => tag.toLowerCase() === category.toLowerCase())

    return matchesQuery && matchesCategory
  })

  // Handle successful registration on mock data
  const handleRegistrationSuccess = () => {
    if (!selectedRegisterEvent) return
    setEvents((prev) =>
      prev.map((item) =>
        item.id === selectedRegisterEvent.id
          ? { ...item, registered: Math.min(item.capacity, item.registered + 1) }
          : item
      )
    )
  }

  return (
    <PageLayout role="student">
      {/* Page Header */}
      <PageHeader
        icon={Megaphone}
        title="Campus News Feed & Announcements"
        subtitle="Explore active campus initiatives, hackathons, and venue reservations for Term 2."
      >
        <StatusBadge variant="green">
          {filteredEvents.length} Active Events
        </StatusBadge>

        <StatusBadge variant="gray" icon={DoorOpen}>
          Next: Rm 302 @ 2:00 PM
        </StatusBadge>
      </PageHeader>

      {/* Search and Category Filter Bar */}
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        categories={CATEGORIES}
        actionLabel="View More Events"
        onAction={() => navigate('/events')}
      />

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
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
        isOpen={!!selectedRegisterEvent}
        event={selectedRegisterEvent}
        onClose={() => setSelectedRegisterEvent(null)}
        onSuccess={handleRegistrationSuccess}
      />
    </PageLayout>
  )
}

export default NewsFeed
