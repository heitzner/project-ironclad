import assert from 'node:assert/strict'
import test from 'node:test'
import { applicationIdentity, applicationOutcome, normalizeApplicationData, validateApplication, createApplicationDraft, applicationErrorMessage } from './councilApplication.model.js'
import { createCouncilService } from '../../services/council.service.js'
import { ApiError } from '../../services/api.js'

// Synthetic inputs exist only in tests; the app has no program/question/identity fixtures.
const user = (code = 'BSCS') => ({ id: 'test-self', name: 'Test applicant', section: 'test-section', program: { id: `test-${code}`, code, label: code } })
const form = (code = 'BSCS') => ({ id: `test-form-${code}`, version: 'test-version', program: user(code).program,
  questions: [1, 2, 3].map((number) => ({ id: `${code}-test-q${number}`, prompt: `${code} test prompt ${number}`, type: 'text', required: true })) })
const data = (code = 'BSCS') => ({ form: form(code), application: null })
const options = (submitApplication, patch = {}) => ({ user: user(), form: form(), canApply: true,
  service: createCouncilService({ operations: { submitApplication } }), ...patch })
const fill = (draft) => { for (const question of draft.form.questions) draft.edit(question.id, '  A test answer\nwith detail.  ') }
const deferred = () => { let resolve, reject; const promise = new Promise((pass, fail) => { resolve = pass; reject = fail }); return { promise, resolve, reject } }
const outcome = { id: 'test-real-response', status: 'pending-review' }

test('four program forms preserve supplied question IDs/prompts and authenticated identity', () => {
  for (const code of ['BSCS', 'BSEMC', 'BSIS', 'BSIT']) {
    const normalized = normalizeApplicationData(data(code), user(code))
    assert.equal(normalized.user.program.code, code)
    assert.equal(normalized.user.id, 'test-self')
    assert.deepEqual(normalized.form.questions.map((q) => q.id), form(code).questions.map((q) => q.id))
    assert.deepEqual(normalized.form.questions.map((q) => q.prompt), form(code).questions.map((q) => q.prompt))
    assert(Object.isFrozen(normalized.form.questions[0]))
    for (const other of ['BSCS', 'BSEMC', 'BSIS', 'BSIT'].filter((value) => value !== code)) {
      assert.throws(() => normalizeApplicationData(data(other), user(code)), { code: 'INVALID_RESPONSE' })
    }
  }
})

test('missing, unsupported or editable-substitute identity and mismatched outcome fail closed', () => {
  for (const value of [null, {}, { ...user(), id: '' }, { ...user(), name: '' }, { ...user(), section: '' }, { ...user(), program: 'BSCS' }, user('UNKNOWN')]) {
    assert.throws(() => applicationIdentity(value), { code: 'INVALID_RESPONSE' })
  }
  for (const value of [null, {}, { id: 'x', status: '' }, { ...outcome, applicantId: 'someone-else' }, { ...outcome, programId: 'another-program' }]) {
    assert.throws(() => applicationOutcome(value, user()), { code: 'INVALID_RESPONSE' })
  }
  assert.deepEqual(applicationOutcome({ ...outcome, applicantId: user().id, programId: user().program.id }, user()), outcome)
})

test('missing metadata, duplicate IDs, unsupported controls and malformed rules reject the form', () => {
  for (const patch of [{ id: '' }, { version: null }, { version: {} }, { questions: [] }, { questions: null }, { program: user('BSIT').program }]) {
    assert.throws(() => normalizeApplicationData({ ...data(), form: { ...form(), ...patch } }, user()), { code: 'INVALID_RESPONSE' })
  }
  for (const patch of [{ id: '' }, { prompt: '' }, { type: 'email' }, { required: undefined }, { required: 'true' }, { minLength: 0 }, { maxLength: 2.5 }, { minLength: 5, maxLength: 3 }]) {
    const source = form(); source.questions[0] = { ...source.questions[0], ...patch }
    assert.throws(() => normalizeApplicationData({ form: source, application: null }, user()), { code: 'INVALID_RESPONSE' })
  }
  const source = form(); source.questions[1].id = source.questions[0].id
  assert.throws(() => normalizeApplicationData({ form: source, application: null }, user()), { code: 'INVALID_RESPONSE' })
})

test('a real existing status and an absent open form are distinct successful responses', () => {
  assert.deepEqual(normalizeApplicationData({ form: null, application: outcome }, user()).application, outcome)
  assert.deepEqual(normalizeApplicationData({ form: null, application: null }, user()), { user: user(), form: null, application: null })
  assert.throws(() => normalizeApplicationData({ form: null }, user()))
})

test('validation follows required flags and supplied limits, trims edges and safely keys unusual IDs', () => {
  const questions = [
    { id: '__proto__', required: true }, { id: 'constructor', required: false, minLength: 3 },
    { id: 'toString', required: true, maxLength: 4 },
  ]
  const errors = validateApplication({ constructor: 'ab', toString: 'abcde' }, questions)
  assert.match(errors.__proto__, /Enter an answer/)
  assert.match(errors.constructor, /at least 3/)
  assert.match(errors.toString, /no more than 4/)
  assert.equal(Object.keys(validateApplication({ ['__proto__']: '  yes  ', constructor: '  ', toString: '  four ' }, questions)).length, 0)
  assert.equal(Object.keys(validateApplication({ a: 'x'.repeat(20000) }, [{ id: 'a', required: true }])).length, 0)
})

test('invalid answers never submit; failed validation and dismissal retain the draft', async () => {
  let calls = 0
  const draft = createApplicationDraft(options(() => { calls += 1 }))
  assert.equal(await draft.submit(), null)
  assert.equal(calls, 0)
  assert.equal(Object.keys(draft.getSnapshot().errors).length, 3)
  draft.edit(draft.form.questions[0].id, '  first answer  ')
  assert.equal(draft.getSnapshot().errors[draft.form.questions[0].id], undefined)
  assert(draft.dismiss())
  assert.equal(draft.getSnapshot().answers[draft.form.questions[0].id], '  first answer  ')
  assert.equal(Object.keys(draft.getSnapshot().errors).length, 0)
})

test('unconnected/denied integration never submits or claims an outcome', async () => {
  let calls = 0
  for (const patch of [{ canApply: false }, { canApply: 'true' }, { service: createCouncilService() }, { service: { submitApplication: () => { calls += 1 } } }, { service: { submitApplication: () => { calls += 1 }, supports: true } }]) {
    const draft = createApplicationDraft(options(() => { calls += 1 }, patch)); fill(draft)
    assert(draft.unavailableReason()); assert.equal(await draft.submit(), null); assert.equal(draft.getSnapshot().outcome, null)
  }
  assert.equal(calls, 0)
})

test('busy guards freeze one keyed payload, exclude applicant IDs and ignore edits/rapid submits/close', async () => {
  const request = deferred(), calls = []
  const draft = createApplicationDraft(options((payload, context) => { calls.push({ payload, context }); return request.promise })); fill(draft)
  draft.edit('forged-question', 'not sent')
  const pending = draft.submit()
  for (let i = 0; i < 8; i += 1) assert.equal(await draft.submit(), null)
  draft.edit(draft.form.questions[0].id, 'changed while busy')
  assert.equal(draft.dismiss(), false)
  assert.equal(calls.length, 1)
  assert(Object.isFrozen(calls[0].payload)); assert(Object.isFrozen(calls[0].payload.answers))
  assert.equal(calls[0].payload.formId, form().id); assert.equal(calls[0].payload.version, form().version)
  assert.deepEqual(Object.keys(calls[0].payload).sort(), ['answers', 'formId', 'version'])
  assert.deepEqual(Object.keys(calls[0].payload.answers), form().questions.map((q) => q.id))
  assert.equal(calls[0].payload.answers[draft.form.questions[0].id], 'A test answer\nwith detail.')
  request.resolve(outcome); assert.deepEqual(await pending, outcome)
  assert.equal(await draft.submit(), null); assert(draft.dismiss()); assert.deepEqual(draft.getSnapshot().outcome, outcome)
  assert.equal(await draft.submit(), null); assert.equal(calls.length, 1)
})

test('generic/null submit errors preserve exact answers and permit recovery', async () => {
  for (const cause of [null, undefined, new Error('test-error')]) {
    let fail = true
    const draft = createApplicationDraft(options(async () => { if (fail) throw cause; return outcome })); fill(draft)
    const before = { ...draft.getSnapshot().answers }
    await draft.submit(); assert.deepEqual(draft.getSnapshot().answers, before); assert.match(applicationErrorMessage(draft.getSnapshot().error), /answers are kept/)
    assert.equal(draft.getSnapshot().busy, false); fail = false
    assert.deepEqual(await draft.submit(), outcome)
  }
})

test('uncertain/conflict/malformed responses require an authoritative status check before resubmitting', async () => {
  for (const cause of [new ApiError('test', { code: 'NETWORK_ERROR' }), new ApiError('test', { status: 409 }), new ApiError('test', { status: 412 }), new ApiError('test', { status: 503 }), new ApiError('test', { code: 'INVALID_RESPONSE' })]) {
    let calls = 0
    const draft = createApplicationDraft(options(async () => { calls += 1; throw cause })); fill(draft)
    await draft.submit(); assert(draft.getSnapshot().requiresCheck); assert(draft.unavailableReason())
    await draft.submit(); assert.equal(calls, 1)
    assert.equal(await draft.checkStatus(async () => null), null); assert(draft.getSnapshot().requiresCheck)
    await draft.checkStatus(async () => data()); assert.equal(draft.getSnapshot().requiresCheck, false)
    await draft.submit(); assert.equal(calls, 2)
  }
  for (const result of [undefined, {}, { id: 'x' }, { ...outcome, applicantId: 'someone-else' }]) {
    const draft = createApplicationDraft(options(async () => result)); fill(draft)
    await draft.submit(); assert.equal(draft.getSnapshot().outcome, null); assert(draft.getSnapshot().requiresCheck)
  }
})

test('status checks accept only the current applicant/schema and show real duplicate/pending statuses', async () => {
  const draft = createApplicationDraft(options(async () => { throw new ApiError('conflict', { status: 409 }) })); fill(draft)
  await draft.submit()
  await draft.checkStatus(async () => data('BSIT')); assert(draft.getSnapshot().requiresCheck)
  await draft.checkStatus(async () => ({ ...data(), form: { ...form(), version: 'new-version' } })); assert(draft.getSnapshot().requiresCheck)
  await draft.checkStatus(async () => ({ form: null, application: outcome }))
  assert.deepEqual(draft.getSnapshot().outcome, outcome); assert.equal(draft.getSnapshot().requiresCheck, false)
  assert.equal(await draft.submit(), null)
})

test('401/403 block retry within the same session; unavailable errors are honest', async () => {
  for (const status of [401, 403]) {
    let calls = 0
    const draft = createApplicationDraft(options(async () => { calls += 1; throw new ApiError('test', { status }) })); fill(draft)
    await draft.submit(); await draft.submit(); assert.equal(calls, 1); assert(draft.unavailableReason())
    assert.equal(await draft.checkStatus(async () => { throw new Error('must not run after auth denial') }), null)
    assert(draft.unavailableReason())
  }
  assert.match(applicationErrorMessage(new ApiError('test', { code: 'OPERATION_UNAVAILABLE' })), /not connected/)
})

test('cancel aborts and suppresses stale success/failure, including ignored abort signals', async () => {
  for (const reject of [false, true]) {
    const request = deferred(); let signal
    const draft = createApplicationDraft(options((payload, context) => { signal = context.signal; return request.promise })); fill(draft)
    const pending = draft.submit(); draft.cancel(); assert(signal.aborted)
    if (reject) request.reject(new Error('late')); else request.resolve(outcome)
    assert.equal(await pending, null); assert.equal(draft.getSnapshot().outcome, null); assert.equal(draft.getSnapshot().error, null)
    assert.equal(draft.getSnapshot().busy, false)
  }
})

test('status checks are guarded, canceled on scope cleanup and cannot overwrite a newer draft', async () => {
  const request = deferred(), draft = createApplicationDraft(options(async () => outcome)); fill(draft)
  const check = draft.checkStatus(() => request.promise)
  assert(draft.getSnapshot().busy); assert.equal(draft.dismiss(), false)
  assert.equal(await draft.checkStatus(() => { throw new Error('must not call') }), null)
  draft.cancel(); request.resolve({ form: null, application: outcome }); assert.equal(await check, null)
  assert.equal(draft.getSnapshot().outcome, null)
  const clean = createApplicationDraft(options(async () => outcome, { user: user('BSIT'), form: form('BSIT') }))
  assert(Object.values(clean.getSnapshot().answers).every((answer) => answer === ''))
})

test('subscriber lifecycle and post-receipt refresh failure preserve the real receipt without resubmitting', async () => {
  const draft = createApplicationDraft(options(async () => outcome)), updates = []
  const unsubscribe = draft.subscribe(() => updates.push(draft.getSnapshot()))
  fill(draft); const result = await draft.submit(); draft.reportRefreshFailure(result)
  assert.equal(draft.getSnapshot().refreshError, true); assert.deepEqual(draft.getSnapshot().outcome, outcome)
  const count = updates.length; unsubscribe(); draft.dismiss(); assert.equal(updates.length, count)
  assert.equal(await draft.submit(), null)
})
