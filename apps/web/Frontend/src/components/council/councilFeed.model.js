import { ApiError } from '../../services/api.js'

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0
const count = (value) => Number.isSafeInteger(value) && value >= 0
const identity = (value) => record(value) && text(value.id)
const optional = (value, valid) => value == null || valid(value)
const image = (value) => record(value) && text(value.src) && optional(value.crop, (crop) => record(crop)
  && Number.isFinite(crop.heightPercent) && crop.heightPercent > 0
  && Number.isFinite(crop.topPercent) && Number.isFinite(crop.leftPercent))

export const initialFeedCriteria = Object.freeze({ query: '', category: '', page: 1 })

export function feedCriteriaReducer(state, action) {
  switch (action.type) {
    case 'query': return { ...state, query: action.value, page: 1 }
    case 'category': return { ...state, category: action.value, page: 1 }
    case 'page': return Number.isSafeInteger(action.value) && action.value >= 1 ? { ...state, page: action.value } : state
    case 'clear': return initialFeedCriteria
    default: return state
  }
}

export function formatCampaignSchedule(schedule) {
  if (!record(schedule) || !text(schedule.timeZone)
    || !text(schedule.startsAt) || !text(schedule.endsAt)
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(schedule.startsAt)
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(schedule.endsAt)) return null
  const start = new Date(schedule.startsAt), end = new Date(schedule.endsAt)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null
  try {
    const date = new Intl.DateTimeFormat('en-PH', { timeZone: schedule.timeZone, year: 'numeric', month: 'short', day: 'numeric' })
    const time = new Intl.DateTimeFormat('en-PH', { timeZone: schedule.timeZone, hour: 'numeric', minute: '2-digit' })
    const startDate = date.format(start), endDate = date.format(end)
    return `${startDate} • ${time.format(start)} – ${startDate === endDate ? '' : `${endDate} • `}${time.format(end)} (${schedule.timeZone})`
  } catch {
    return null
  }
}

export function registrationProgress(registration) {
  if (!record(registration) || !count(registration.registered) || !count(registration.capacity) || registration.capacity === 0) return null
  const percent = registration.registered / registration.capacity * 100
  const unit = registration.kind === 'team' ? 'teams' : 'participants'
  return { percent, label: `${registration.registered} of ${registration.capacity} ${unit} registered` }
}

// Validate the richer feed boundary before rendering; incomplete data never becomes fake totals.
export function validateFeed(data) {
  const unique = (items) => new Set(items.map((item) => item.id)).size === items.length
  const validAction = (action) => record(action) && typeof action.available === 'boolean' && optional(action.reason, text)
  const validCampaign = (item) => identity(item) && text(item.title)
    && optional(item.description, (value) => typeof value === 'string')
    && optional(item.image, image)
    && optional(item.status, (value) => record(value) && text(value.label))
    && optional(item.venue, (value) => identity(value) && text(value.name))
    && optional(item.schedule, (value) => formatCampaignSchedule(value) !== null)
    && optional(item.category, (value) => identity(value) && text(value.label))
    && optional(item.tags, (value) => Array.isArray(value) && value.every(text))
    && optional(item.organizer, (value) => record(value) && text(value.name))
    && optional(item.registration, (value) => record(value) && ['individual', 'team'].includes(value.kind)
      && count(value.registered) && count(value.capacity) && optional(value.actionLabel, text))
    && optional(item.actions, (value) => record(value) && optional(value.viewVenue, validAction) && optional(value.register, validAction))
  const valid = record(data) && Array.isArray(data.categories) && Array.isArray(data.campaigns)
    && data.categories.every((item) => identity(item) && text(item.label)) && unique(data.categories)
    && data.campaigns.every(validCampaign) && unique(data.campaigns)
    && (data.council === null || (identity(data.council) && text(data.council.name) && count(data.council.activeEventCount)
      && optional(data.council.logo, image) && optional(data.council.description, (value) => typeof value === 'string')))
    && (data.council !== null || data.campaigns.length === 0)
    && optional(data.pagination, (value) => record(value) && Number.isSafeInteger(value.page) && value.page >= 1
      && Number.isSafeInteger(value.totalPages) && value.totalPages >= value.page)
  if (!valid) throw new ApiError('The Council feed response is incomplete. Please retry.', { code: 'INVALID_RESPONSE' })
  return data
}

export function feedViewState(resource, criteria) {
  if (resource.error?.status === 401) return 'signed-out'
  if (resource.error?.status === 403) return 'forbidden'
  if (['signed-out', 'forbidden', 'unavailable', 'error'].includes(resource.status)) return resource.status
  if (resource.loading) return 'loading'
  if (!resource.data) return 'unavailable'
  if (!resource.data.council) return 'empty'
  if (resource.data.campaigns.length === 0) return criteria.query.trim() || criteria.category ? 'no-results' : 'empty'
  return 'success'
}

// Callback handoffs have busy/error states, but never manufacture a saved/registered outcome.
export function createFeedAction(callback, subject, context = {}) {
  let snapshot = { busy: false, error: null }
  let revision = 0, controller
  const listeners = new Set()
  const publish = (next) => { snapshot = next; listeners.forEach((listener) => listener()) }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    cancel: () => { revision += 1; controller?.abort() },
    run: async () => {
      if (snapshot.busy || typeof callback !== 'function') return
      const current = ++revision
      controller = new AbortController()
      publish({ busy: true, error: null })
      try {
        await callback(subject, { ...context, signal: controller.signal })
        if (revision === current) publish({ busy: false, error: null })
      } catch (cause) {
        if (revision === current) publish({ busy: false, error: cause instanceof Error ? cause : new ApiError('The action could not be opened. Please try again.') })
      }
    },
  }
}
