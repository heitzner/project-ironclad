import badmintonImage from '../assets/badminton.jpg'
import esportsImage from '../assets/egames.jpg'

const categories = [
  { id: 'preview-sports', label: 'Sports' },
  { id: 'preview-esports', label: 'Esports' },
]
const previewReason = 'Sample event for UI viewing. This action is unavailable in the preview.'
const campaigns = [
  {
    id: 'preview-badminton', title: 'Badminton Tryouts',
    description: 'Ready to represent your program? Join the campus badminton tryouts, meet fellow players, and bring your best game to the court.',
    image: { src: badmintonImage, alt: 'Badminton event' }, category: categories[0],
    venue: { id: 'preview-court', name: 'Campus Sports Court' },
    schedule: { startsAt: '2026-11-06T08:00:00+08:00', endsAt: '2026-11-06T12:00:00+08:00', timeZone: 'Asia/Manila' },
    registration: { kind: 'individual', registered: 24, capacity: 40 },
    organizer: { name: 'Student Council · Sports Committee' }, tags: ['Preview', 'Tryouts'],
  },
  {
    id: 'preview-esports', title: 'Campus Esports Tournament',
    description: 'Gather your team for a day of friendly competition. Celebrate teamwork, strategy, and campus spirit with the student esports community.',
    image: { src: esportsImage, alt: 'Campus esports event' }, category: categories[1],
    venue: { id: 'preview-lab', name: 'Computer Laboratory' },
    schedule: { startsAt: '2026-11-13T09:00:00+08:00', endsAt: '2026-11-13T17:00:00+08:00', timeZone: 'Asia/Manila' },
    registration: { kind: 'team', registered: 8, capacity: 16 },
    organizer: { name: 'Student Council · Esports Committee' }, tags: ['Preview', 'Team event'],
  },
].map(campaign => ({
  ...campaign,
  status: { label: 'Sample event' },
  actions: { viewVenue: { available: false, reason: previewReason }, register: { available: false, reason: previewReason } },
}))

function freeze(value) {
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) freeze(item) })
  return Object.freeze(value)
}

// One immutable content source is used by both Viewer and Council preview reads.
export const previewFeed = freeze({
  preview: true, categories, campaigns, activeEventCount: campaigns.length,
  council: { id: 'preview-campus-council', name: 'Campus news & announcements', activeEventCount: campaigns.length, description: 'Student Council initiatives and campus events.' },
})

export function getPreviewFeed({ query = '', category = '' } = {}) {
  const search = query.trim().toLowerCase()
  return {
    ...previewFeed,
    campaigns: previewFeed.campaigns.filter(campaign => (!category || campaign.category.id === category)
      && `${campaign.title} ${campaign.description} ${campaign.venue.name} ${campaign.organizer.name}`.toLowerCase().includes(search)),
  }
}
