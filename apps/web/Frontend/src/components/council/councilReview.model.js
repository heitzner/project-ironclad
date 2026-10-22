import { ApiError } from '../../services/api.js'

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0
const count = (value) => Number.isSafeInteger(value) && value >= 0
const version = (value) => text(value) || count(value)
const optional = (value, valid) => value == null || valid(value)
const labeled = (value) => record(value) && text(value.id) && text(value.label)
const invalid = () => new ApiError('The membership application response is incomplete. Reload the latest applications.', { code: 'INVALID_RESPONSE' })
const action = (value) => record(value) && typeof value.available === 'boolean' && optional(value.reason, text)
const exportMetadata = (metadata) => action(metadata) && (!metadata.available || (text(metadata.format)
  && text(metadata.filename) && !/[\\/<>:"|?*]/.test(metadata.filename) && !Array.from(metadata.filename).some((character) => character.charCodeAt(0) < 32) && !/^\.+$/.test(metadata.filename)
  && ['all', 'filtered', 'page'].includes(metadata.scope) && text(metadata.scopeLabel)))

export const initialReviewCriteria = Object.freeze({ query: '', program: '', status: '', page: 1 })
export function reviewCriteriaReducer(state, event) {
  if (['query', 'program', 'status'].includes(event.type) && typeof event.value === 'string') return { ...state, [event.type]: event.value, page: 1 }
  if (event.type === 'page' && Number.isSafeInteger(event.value) && event.value > 0) return { ...state, page: event.value }
  return event.type === 'clear' ? initialReviewCriteria : state
}

export function formatApplicationDate(submittedAt, timeZone) {
  if (!text(submittedAt) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(submittedAt) || !text(timeZone)) return null
  const date = new Date(submittedAt)
  if (!Number.isFinite(date.getTime())) return null
  try { return new Intl.DateTimeFormat('en-PH', { timeZone, month: 'short', day: 'numeric', year: 'numeric' }).format(date) }
  catch { return null }
}

function validApplication(value) {
  return record(value) && text(value.id) && labeled(value.status) && optional(value.version, version)
    && record(value.applicant) && text(value.applicant.id) && text(value.applicant.name)
    && labeled(value.applicant.program) && text(value.applicant.section)
    && formatApplicationDate(value.submittedAt, value.timeZone) !== null
    && record(value.actions) && action(value.actions.accept) && action(value.actions.reject)
}

export function validateReviewData(data, criteria) {
  const options = (items) => Array.isArray(items) && items.every(labeled) && new Set(items.map(({ id }) => id)).size === items.length
  const pagination = data?.pagination
  if (!record(data) || !Array.isArray(data.applications) || !data.applications.every(validApplication)
    || new Set(data.applications.map(({ id }) => id)).size !== data.applications.length || !count(data.pendingTotal)
    || !record(data.filters) || !options(data.filters.programs) || !options(data.filters.statuses)
    || !record(pagination) || !count(pagination.totalItems) || !Number.isSafeInteger(pagination.pageSize) || pagination.pageSize < 1
    || !Number.isSafeInteger(pagination.page) || pagination.page < 1
    || pagination.totalPages !== Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize))
    || pagination.page > pagination.totalPages || (criteria && pagination.page !== criteria.page)
    || data.applications.length > Math.min(pagination.pageSize, pagination.totalItems - (pagination.page - 1) * pagination.pageSize)
    || !optional(data.policy, (policy) => record(policy) && text(policy.title) && text(policy.summary))
    || !optional(data.export, exportMetadata)) throw invalid()
  return data
}

export function reviewOutcome(value, application) {
  if (!record(value) || !record(value.application) || value.application.id !== application.id || !text(value.application.status)
    || !optional(value.application.applicantId, (id) => id === application.applicant.id)
    || !optional(value.notification, (notification) => record(notification) && text(notification.status)
      && optional(notification.channel, text) && optional(notification.recipient, text))) throw invalid()
  return Object.freeze({ application: Object.freeze({ id: value.application.id, status: value.application.status }),
    applicantName: application.applicant.name,
    notification: value.notification ? Object.freeze({ status: value.notification.status, channel: value.notification.channel, recipient: value.notification.recipient }) : null })
}

export function reviewErrorMessage(error) {
  if (error?.status === 401) return 'Sign in again before reviewing applications.'
  if (error?.status === 403) return 'Application review is no longer available for your account.'
  if (error?.conflict) return 'This application changed. Reload its latest status before making another decision.'
  if (error?.unavailable) return 'Application review is not connected yet. The displayed status has not been changed.'
  if (['NETWORK_ERROR', 'INVALID_RESPONSE'].includes(error?.code) || error?.name === 'AbortError' || error?.status >= 500) return 'The decision could not be confirmed. Reload the latest status before trying again.'
  return 'The decision could not be saved. The displayed status has not been changed. Please try again.'
}

// One mutation at a time in an authenticated review session. Counts/rows are never edited locally.
export function createReviewActions({ service, userId, canReview, canExport } = {}) {
  let snapshot = { busy: false, checking: false, exporting: false, target: null, error: null, requiresCheck: [], settledIds: [], outcome: null, download: null, refreshError: false, checkMessage: null }
  let revision = 0, controller
  const listeners = new Set()
  const publish = (next) => { snapshot = next; listeners.forEach((listener) => listener()) }
  const supports = (operation) => typeof service?.[operation] === 'function' && service?.supports?.(operation) === true
  const authReason = () => !text(userId) ? 'Sign in before reviewing applications.' : canReview !== true ? 'Application review is not available for your account.'
    : [401, 403].includes(snapshot.error?.status) ? reviewErrorMessage(snapshot.error) : undefined
  const begin = (patch) => {
    const current = ++revision
    controller = new AbortController()
    publish({ ...snapshot, busy: true, error: null, checkMessage: null, ...patch })
    return current
  }
  const store = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    cancel: () => { revision += 1; controller?.abort(); if (snapshot.busy) publish({ ...snapshot, busy: false, checking: false, exporting: false }) },
    dismiss: () => { if (snapshot.busy) return false; publish({ ...snapshot, outcome: null, download: null }); return true },
    decisionReason: (application, decision) => authReason() || (!supports('reviewApplication') ? 'Application decisions are not connected yet.'
      : snapshot.settledIds.includes(application.id) ? 'A decision was received for this application. Reload to see its current status.'
        : snapshot.requiresCheck.includes(application.id) ? 'Reload the latest status before reviewing this application again.'
          : application.actions?.[decision]?.available !== true ? application.actions?.[decision]?.reason || 'This decision is not available for the application.' : undefined),
    exportReason: (metadata) => authReason() || (canExport !== true ? 'Export is not available for your account.' : !supports('exportApplications') ? 'Application export is not connected yet.'
      : metadata?.available !== true ? metadata?.reason || 'Export information has not been supplied.' : undefined),
    decide: async (application, decision, refresh) => {
      if (snapshot.busy || snapshot.outcome || snapshot.download || !validApplication(application) || !['accept', 'reject'].includes(decision) || store.decisionReason(application, decision)) return null
      const target = Object.freeze({ id: application.id, name: application.applicant.name, decision })
      const subject = Object.freeze({ id: application.id, applicant: Object.freeze({ id: application.applicant.id, name: application.applicant.name }) })
      const current = begin({ target, operation: 'review', refreshError: false })
      const payload = Object.freeze({ applicationId: application.id, decision, ...(application.version == null ? {} : { version: application.version }) })
      try {
        const result = reviewOutcome(await service.reviewApplication(payload, { signal: controller.signal }), subject)
        if (current !== revision) return null
        publish({ ...snapshot, outcome: result, settledIds: [...snapshot.settledIds, application.id] })
        let refreshError = false
        try { validateReviewData(await refresh?.()) } catch { refreshError = true }
        if (current !== revision) return null
        publish({ ...snapshot, busy: false, refreshError })
        return result
      } catch (cause) {
        if (current !== revision) return null
        const error = cause instanceof Error ? cause : new ApiError('The decision could not be saved.')
        const uncertain = error.conflict || ['NETWORK_ERROR', 'INVALID_RESPONSE'].includes(error.code) || error.name === 'AbortError' || error.status >= 500
        publish({ ...snapshot, busy: false, error, requiresCheck: uncertain ? [...new Set([...snapshot.requiresCheck, application.id])] : snapshot.requiresCheck })
        return null
      }
    },
    checkStatus: async (refresh, applicationId = snapshot.target?.id) => {
      if (snapshot.busy || authReason() || typeof refresh !== 'function') return null
      const current = begin({ checking: true, operation: 'check' })
      try {
        const data = validateReviewData(await refresh())
        if (current !== revision) return null
        const application = data.applications.find(({ id }) => id === applicationId)
        publish({ ...snapshot, busy: false, checking: false,
          requiresCheck: application ? snapshot.requiresCheck.filter((id) => id !== application.id) : snapshot.requiresCheck,
          checkMessage: application ? `Latest status for ${application.applicant.name}: ${application.status.label}. Review the refreshed row before deciding.`
            : 'The application is not in the latest results. No decision was retried. Change the filters to locate its current record.' })
        return data
      } catch (cause) {
        if (current !== revision) return null
        publish({ ...snapshot, busy: false, checking: false, error: cause instanceof Error ? cause : invalid() })
        return null
      }
    },
    export: async (criteria, metadata) => {
      if (snapshot.busy || snapshot.outcome || snapshot.download || !exportMetadata(metadata) || store.exportReason(metadata)) return null
      const { filename, scopeLabel } = metadata
      const current = begin({ exporting: true, operation: 'export', target: null })
      const payload = Object.freeze({ format: metadata.format, scope: metadata.scope,
        ...(metadata.scope === 'all' ? {} : { query: criteria.query.trim(), program: criteria.program, status: criteria.status }),
        ...(metadata.scope === 'page' ? { page: criteria.page } : {}) })
      try {
        const blob = await service.exportApplications(payload, { signal: controller.signal })
        if (current !== revision) return null
        if (!(blob instanceof Blob) || blob.size === 0) throw invalid()
        const download = Object.freeze({ blob, filename, scopeLabel })
        publish({ ...snapshot, busy: false, exporting: false, download })
        return download
      } catch (cause) {
        if (current !== revision) return null
        publish({ ...snapshot, busy: false, exporting: false, error: cause instanceof Error ? cause : invalid() })
        return null
      }
    },
  }
  return store
}
