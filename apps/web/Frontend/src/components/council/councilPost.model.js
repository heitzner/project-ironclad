import { ApiError } from '../../services/api.js'

const fields = ['header', 'description']
const labels = { header: 'Header', description: 'Description' }
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0
const blank = () => ({ header: '', description: '' })

// Limits are optional integration metadata, never institutional rules inferred from Figma.
export function normalizePostConstraints(constraints = {}) {
  if (!record(constraints)) throw new ApiError('Post requirements are unavailable.', { code: 'INVALID_CONSTRAINTS' })
  const normalized = {}
  for (const field of fields) {
    const limits = constraints[field] ?? {}
    if (!record(limits) || ['minLength', 'maxLength'].some((key) => limits[key] != null
      && (!Number.isSafeInteger(limits[key]) || limits[key] < 1))
      || (limits.minLength != null && limits.maxLength != null && limits.minLength > limits.maxLength)) {
      throw new ApiError('Post requirements are unavailable.', { code: 'INVALID_CONSTRAINTS' })
    }
    normalized[field] = Object.freeze({ minLength: limits.minLength, maxLength: limits.maxLength })
  }
  return Object.freeze(normalized)
}

export function validatePost(values, constraints = {}) {
  const limits = normalizePostConstraints(constraints)
  const errors = {}
  for (const field of fields) {
    const value = typeof values[field] === 'string' ? values[field].trim() : ''
    if (!value) errors[field] = `Enter a ${field}.`
    else if (limits[field].minLength && value.length < limits[field].minLength) errors[field] = `${labels[field]} must contain at least ${limits[field].minLength} characters.`
    else if (limits[field].maxLength && value.length > limits[field].maxLength) errors[field] = `${labels[field]} must contain no more than ${limits[field].maxLength} characters.`
  }
  return errors
}

export function postErrorMessage(error) {
  if (error?.status === 401) return 'Sign in again before posting. Your draft is kept on this page.'
  if (error?.status === 403) return 'Posting is no longer available for your account. Your draft is kept on this page.'
  if (error?.conflict) return 'A conflicting post was reported. Your draft is kept. Check the feed before trying again.'
  if (error?.unavailable) return 'Posting is not connected yet. Your draft is kept on this page.'
  if (error?.code === 'INVALID_RESPONSE' || error?.code === 'NETWORK_ERROR') return 'We could not confirm whether your post was created. Your draft is kept. Check the feed before trying again.'
  return 'The post could not be submitted. Your draft is kept. Please try again.'
}

export function createPostDraft({ service, userId, councilId, canCreatePost, constraints } = {}) {
  let snapshot = { values: blank(), errors: {}, busy: false, error: null, outcome: null, refreshError: false }
  let revision = 0, controller, limits, constraintError
  try { limits = normalizePostConstraints(constraints) } catch (error) { constraintError = error }
  const listeners = new Set()
  const publish = (next) => { snapshot = next; listeners.forEach((listener) => listener()) }
  const unavailableReason = () => !text(userId) ? 'Sign in before posting.'
    : canCreatePost !== true ? 'Posting is not available for your account.'
    : !text(councilId) ? 'Council information is needed before posting.'
      : constraintError ? 'Post requirements are unavailable. Refresh Council information before posting.'
        : typeof service?.createPost !== 'function' || typeof service?.supports !== 'function' || service.supports('createPost') !== true ? 'Posting is not connected yet.'
          : snapshot.error?.status === 401 || snapshot.error?.status === 403 ? postErrorMessage(snapshot.error) : undefined

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    limits,
    unavailableReason,
    edit: (field, value) => {
      if (snapshot.busy || snapshot.outcome || !fields.includes(field) || typeof value !== 'string') return
      publish({ ...snapshot, values: { ...snapshot.values, [field]: value }, errors: { ...snapshot.errors, [field]: undefined } })
    },
    dismiss: () => {
      if (snapshot.busy) return false
      publish({ ...snapshot, errors: {}, outcome: null, refreshError: false })
      return true // Cancellation retains the draft until this identity/Council scope unmounts.
    },
    cancel: () => { revision += 1; controller?.abort() },
    reportRefreshFailure: (outcome) => {
      if (snapshot.outcome === outcome) publish({ ...snapshot, refreshError: true })
    },
    submit: async () => {
      if (snapshot.busy || snapshot.outcome || unavailableReason()) return null
      const errors = validatePost(snapshot.values, limits)
      if (Object.keys(errors).length) {
        publish({ ...snapshot, errors, error: null })
        return null
      }
      const current = ++revision
      controller = new AbortController()
      const payload = Object.freeze({ councilId, header: snapshot.values.header.trim(), description: snapshot.values.description.trim() })
      publish({ ...snapshot, busy: true, error: null, errors: {} })
      try {
        const outcome = await service.createPost(payload, { signal: controller.signal })
        if (current !== revision) return null
        if (!record(outcome) || !text(outcome.id) || !text(outcome.status)) throw new ApiError('The post response is incomplete.', { code: 'INVALID_RESPONSE' })
        publish({ values: blank(), errors: {}, busy: false, error: null, outcome, refreshError: false })
        return outcome
      } catch (cause) {
        if (current !== revision) return null
        publish({ ...snapshot, busy: false, error: cause instanceof Error ? cause : new ApiError('The post could not be submitted.') })
        return null
      }
    },
  }
}
