const text = value => typeof value === 'string'
const identity = value => text(value?.id) && Boolean(value.id.trim())
const optionalText = value => value == null || text(value)
const unique = values => new Set(values.map(value => value?.id)).size === values.length

// These are the teammate's normalized presentation shapes, not HTTP response contracts.
export function validEvents(value) {
  return Array.isArray(value) && unique(value) && value.every(event => identity(event) && text(event.title)
    && ['description', 'venue', 'schedule', 'organizer', 'category', 'imageUrl', 'venueChip', 'status', 'actionLabel', 'badge'].every(key => optionalText(event[key]))
    && (event.registrationKind == null || ['individual', 'team'].includes(event.registrationKind))
    && (event.registrationOptions == null || ((event.registrationOptions.categories == null || (Array.isArray(event.registrationOptions.categories) && event.registrationOptions.categories.every(text)))
      && (event.registrationOptions.teamSize == null || (Number.isInteger(event.registrationOptions.teamSize) && event.registrationOptions.teamSize > 0 && event.registrationOptions.teamSize <= 50))
      && optionalText(event.registrationOptions.agreement)))
    && (event.tags == null || (Array.isArray(event.tags) && event.tags.every(text)))
    && ['registered', 'capacity'].every(key => event[key] == null || (Number.isInteger(event[key]) && event[key] >= 0)))
}

export function validArchive(value) {
  return Array.isArray(value?.records) && unique(value.records) && value.records.every(record => identity(record)
    && ['title', 'organizer', 'courseSection', 'concludedDate'].every(key => text(record[key]))
    && ['permitNo', 'category', 'academicYear', 'semester', 'startTime', 'endTime', 'categoryTone'].every(key => optionalText(record[key]))
    && text(record.venue?.label) && optionalText(record.venue.id) && optionalText(record.venue.type))
    && optionalText(value.policy)
    && (value.filters == null || (
      ['academicYears', 'semesters'].every(key => value.filters[key] == null || (Array.isArray(value.filters[key]) && value.filters[key].every(text)))
      && (value.filters.venues == null || (Array.isArray(value.filters.venues) && value.filters.venues.every(venue => text(venue?.label) && optionalText(venue.id))))))
    && (value.summary == null || (Number.isInteger(value.summary.totalArchived) && value.summary.totalArchived >= 0 && text(value.summary.coverageLabel)))
}

export function validProfile(value) {
  return value?.profile === null || (identity(value?.profile)
    && text(value.profile.studentId) && text(value.profile.fullName)
    && ['email', 'position', 'avatarUrl', 'programName', 'programCode', 'section', 'lastSyncedAt', 'sourceLabel'].every(key => optionalText(value.profile[key])))
}

export function filterArchive(records, { search = '', academicYear = '', semester = '', venueId = '' } = {}) {
  const query = search.trim().toLowerCase()
  return records.filter(item => (!query || [item.title, item.organizer, item.courseSection, item.permitNo].some(value => value?.toLowerCase().includes(query)))
    && (!academicYear || item.academicYear === academicYear)
    && (!semester || item.semester === semester)
    && (!venueId || (item.venue.id ?? item.venue.label) === venueId))
}

export function pageOf(items, page = 1, pageSize = 6) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.max(1, Math.min(page, totalPages))
  return { page: current, totalPages, items: items.slice((current - 1) * pageSize, current * pageSize) }
}

export function previewStudentEvents(feed) {
  return feed.campaigns.map(campaign => ({
    id: campaign.id, title: campaign.title, description: campaign.description,
    imageUrl: campaign.image.src, venue: campaign.venue.name,
    schedule: new Intl.DateTimeFormat('en-PH', { timeZone: campaign.schedule.timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(campaign.schedule.startsAt)),
    category: campaign.category.label, tags: campaign.tags,
    organizer: campaign.organizer.name, status: campaign.status.label,
    registered: campaign.registration.registered, capacity: campaign.registration.capacity,
    registrationKind: campaign.registration.kind,
    registrationUnavailableReason: campaign.actions.register.reason,
    preview: true,
  }))
}
