import { ApiError } from '../../services/api.js'

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0
const programs = new Set(['BSCS', 'BSEMC', 'BSIS', 'BSIT'])
const invalid = () => new ApiError('The application information is incomplete or does not match your account.', { code: 'INVALID_RESPONSE' })

// Program metadata is supplied by the authenticated session, never a selector or a Figma identity.
export function applicationIdentity(user) {
  if (!record(user) || !text(user.id) || !text(user.name) || !text(user.section)
    || !record(user.program) || !text(user.program.id) || !programs.has(user.program.code) || !text(user.program.label)) throw invalid()
  return { id: user.id, name: user.name, section: user.section,
    program: { id: user.program.id, code: user.program.code, label: user.program.label } }
}

export function applicationOutcome(value, user) {
  if (!record(value) || !text(value.id) || !text(value.status)
    || (value.applicantId != null && value.applicantId !== user.id)
    || (value.programId != null && value.programId !== user.program.id)) throw invalid()
  return Object.freeze({ id: value.id, status: value.status })
}

export function normalizeApplicationData(data, currentUser) {
  const user = applicationIdentity(currentUser)
  if (!record(data)) throw invalid()
  const application = data.application === null ? null : applicationOutcome(data.application, user)
  let form = null
  if (data.form !== null) {
    const source = data.form
    if (!record(source) || !text(source.id)
      || !(text(source.version) || (Number.isSafeInteger(source.version) && source.version >= 0))
      || source.program?.id !== user.program.id || source.program?.code !== user.program.code
      || !Array.isArray(source.questions) || !source.questions.length) throw invalid()
    const ids = new Set()
    const questions = source.questions.map((question) => {
      if (!record(question) || !text(question.id) || ids.has(question.id) || !text(question.prompt)
        || !['text', 'textarea'].includes(question.type) || typeof question.required !== 'boolean'
        || ['minLength', 'maxLength'].some((key) => question[key] != null && (!Number.isSafeInteger(question[key]) || question[key] < 1))
        || (question.minLength != null && question.maxLength != null && question.minLength > question.maxLength)) throw invalid()
      ids.add(question.id)
      return Object.freeze({ id: question.id, prompt: question.prompt, type: question.type, required: question.required,
        minLength: question.minLength, maxLength: question.maxLength })
    })
    form = Object.freeze({ id: source.id, version: source.version,
      program: Object.freeze({ id: user.program.id, code: user.program.code }), questions: Object.freeze(questions) })
  }
  return { user, form, application }
}

export function validateApplication(answers, questions) {
  const errors = Object.create(null)
  for (const question of questions) {
    const answer = typeof answers[question.id] === 'string' ? answers[question.id].trim() : ''
    if (!answer && question.required) errors[question.id] = 'Enter an answer to this question.'
    else if (answer && question.minLength && answer.length < question.minLength) errors[question.id] = `Use at least ${question.minLength} characters.`
    else if (answer && question.maxLength && answer.length > question.maxLength) errors[question.id] = `Use no more than ${question.maxLength} characters.`
  }
  return errors
}

export function applicationErrorMessage(error) {
  if (error?.status === 401) return 'Sign in again before applying. Your answers are kept on this page.'
  if (error?.status === 403) return 'Self-application is no longer available for your account. Your answers are kept.'
  if (error?.conflict) return 'An existing application or changed form was reported. Check application status before submitting again.'
  if (error?.unavailable) return 'Application submission is not connected yet. Your answers are kept.'
  if (error?.code === 'NETWORK_ERROR' || error?.code === 'INVALID_RESPONSE' || error?.status >= 500) return 'We could not confirm whether your application was received. Check application status before submitting again.'
  return 'Your application could not be submitted. Your answers are kept. Please try again.'
}

export function createApplicationDraft({ service, user: currentUser, form: currentForm, canApply } = {}) {
  const { user, form } = normalizeApplicationData({ form: currentForm, application: null }, currentUser)
  if (!form) throw invalid()
  const emptyAnswers = () => Object.fromEntries(form.questions.map((question) => [question.id, '']))
  let snapshot = { answers: emptyAnswers(), errors: {}, busy: false, checking: false, error: null, outcome: null, requiresCheck: false, refreshError: false }
  let revision = 0, controller
  const listeners = new Set()
  const publish = (next) => { snapshot = next; listeners.forEach((listener) => listener()) }
  const unavailableReason = () => canApply !== true ? 'Self-application is not available for your account.'
    : typeof service?.submitApplication !== 'function' || typeof service?.supports !== 'function' || service.supports('submitApplication') !== true ? 'Application submission is not connected yet.'
      : [401, 403].includes(snapshot.error?.status) ? applicationErrorMessage(snapshot.error)
        : snapshot.requiresCheck ? 'Check application status before submitting again.' : undefined
  const store = {
    user, form,
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    unavailableReason,
    edit: (id, answer) => {
      if (snapshot.busy || snapshot.outcome || !form.questions.some((question) => question.id === id) || typeof answer !== 'string') return
      publish({ ...snapshot, answers: { ...snapshot.answers, [id]: answer }, errors: { ...snapshot.errors, [id]: undefined } })
    },
    dismiss: () => {
      if (snapshot.busy) return false
      publish({ ...snapshot, errors: {} })
      return true // Keep both unsaved answers and a genuine receipt across closing/reopening.
    },
    cancel: () => { revision += 1; controller?.abort(); if (snapshot.busy) publish({ ...snapshot, busy: false, checking: false }) },
    reportRefreshFailure: (outcome) => { if (snapshot.outcome === outcome) publish({ ...snapshot, refreshError: true }) },
    checkStatus: async (refetch) => {
      if (snapshot.busy || [401, 403].includes(snapshot.error?.status) || typeof refetch !== 'function') return null
      const current = ++revision
      publish({ ...snapshot, busy: true, checking: true })
      try {
        const fresh = normalizeApplicationData(await refetch(), user)
        if (current !== revision) return null
        if (fresh.application) {
          publish({ ...snapshot, answers: emptyAnswers(), busy: false, checking: false, error: null, requiresCheck: false, outcome: fresh.application, refreshError: false })
        } else if (fresh.form && JSON.stringify(fresh.form) === JSON.stringify(form)) {
          publish({ ...snapshot, busy: false, checking: false, error: null, requiresCheck: false })
        } else {
          publish({ ...snapshot, busy: false, checking: false, requiresCheck: true })
        }
        return fresh
      } catch {
        if (current === revision) publish({ ...snapshot, busy: false, checking: false, refreshError: true })
        return null
      }
    },
    submit: async () => {
      if (snapshot.busy || snapshot.outcome || unavailableReason()) return null
      const errors = validateApplication(snapshot.answers, form.questions)
      if (Object.keys(errors).length) { publish({ ...snapshot, errors, error: null }); return null }
      const current = ++revision
      controller = new AbortController()
      const payload = Object.freeze({ formId: form.id, version: form.version,
        answers: Object.freeze(Object.fromEntries(form.questions.map(({ id }) => [id, snapshot.answers[id].trim()]))) })
      publish({ ...snapshot, busy: true, error: null, errors: {}, refreshError: false })
      try {
        const result = await service.submitApplication(payload, { signal: controller.signal })
        if (current !== revision) return null
        const outcome = applicationOutcome(result, user)
        publish({ ...snapshot, answers: emptyAnswers(), busy: false, error: null, outcome, requiresCheck: false })
        return outcome
      } catch (cause) {
        if (current !== revision) return null
        const error = cause instanceof Error ? cause : new ApiError('The application could not be submitted.')
        publish({ ...snapshot, busy: false, error,
          requiresCheck: Boolean(error.conflict || error.code === 'NETWORK_ERROR' || error.code === 'INVALID_RESPONSE' || error.status >= 500) })
        return null
      }
    },
  }
  return store
}
