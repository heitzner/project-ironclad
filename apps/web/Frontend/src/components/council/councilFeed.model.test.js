import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../../services/api.js'
import { createFeedAction, feedCriteriaReducer, feedViewState, formatCampaignSchedule, initialFeedCriteria, registrationProgress, validateFeed } from './councilFeed.model.js'

const campaign = () => ({
  id: 'test-campaign', title: 'Test campaign',
  registration: { kind: 'individual', registered: 3, capacity: 8 },
  schedule: { startsAt: '2026-10-19T16:30:00Z', endsAt: '2026-10-19T17:30:00Z', timeZone: 'Asia/Manila' },
})
const feed = () => ({ council: { id: 'test-council', name: 'Test council', activeEventCount: 19 }, campaigns: [campaign()], categories: [{ id: 'test-category', label: 'Test category' }] })

test('search and category combine, preserve each other and reset paging; clear resets both', () => {
  const searched = feedCriteriaReducer({ query: '', category: 'test-category', page: 4 }, { type: 'query', value: '  campus  ' })
  assert.deepEqual(searched, { query: '  campus  ', category: 'test-category', page: 1 })
  const categorized = feedCriteriaReducer({ ...searched, page: 3 }, { type: 'category', value: 'another-category' })
  assert.deepEqual(categorized, { query: '  campus  ', category: 'another-category', page: 1 })
  assert.deepEqual(feedCriteriaReducer(categorized, { type: 'clear' }), initialFeedCriteria)
  assert.equal(feedCriteriaReducer(categorized, { type: 'page', value: -1 }), categorized)
})

test('real summary count is independent of returned campaign page length', () => {
  const data = feed()
  assert.equal(validateFeed(data), data)
  assert.equal(data.council.activeEventCount, 19)
  assert.equal(validateFeed({ ...data, campaigns: [] }).council.activeEventCount, 19)
})

test('missing optional metadata is allowed, missing identities/counters and malformed nested data fail', () => {
  assert.doesNotThrow(() => validateFeed({ ...feed(), campaigns: [{ id: 'test-minimal', title: 'Minimal' }] }))
  const broken = [
    { ...feed(), council: { id: 'c', name: 'Council' } },
    { ...feed(), campaigns: [null] },
    { ...feed(), campaigns: [campaign(), campaign()] },
    { ...feed(), categories: [{ id: 'c', label: {} }] },
    { ...feed(), campaigns: [{ ...campaign(), registration: { kind: 'team', registered: -1, capacity: 8 } }] },
    { ...feed(), campaigns: [{ ...campaign(), tags: [null] }] },
    { ...feed(), campaigns: [{ ...campaign(), image: { src: 'test.png', crop: { heightPercent: Infinity } } }] },
    { ...feed(), pagination: { page: 4, totalPages: 2 } },
    { ...feed(), council: null },
  ]
  for (const data of broken) assert.throws(() => validateFeed(data), { code: 'INVALID_RESPONSE' })
})

test('progress keeps actual counts, handles unknown/zero capacity, clamps only the visual value', () => {
  assert.deepEqual(registrationProgress({ kind: 'team', registered: 3, capacity: 8 }), { percent: 37.5, label: '3 of 8 teams registered' })
  assert.deepEqual(registrationProgress({ kind: 'individual', registered: 12, capacity: 10 }), { percent: 120, label: '12 of 10 participants registered' })
  assert.equal(registrationProgress({ kind: 'individual', registered: 0, capacity: 8 }).percent, 0)
  for (const value of [null, {}, { registered: 0, capacity: 0 }, { registered: -1, capacity: 10 }]) assert.equal(registrationProgress(value), null)
})

test('schedule uses the supplied timezone, crosses dates, and rejects invalid or timezone-less intervals', () => {
  assert.match(formatCampaignSchedule(campaign().schedule), /20 Oct 2026|Oct 20, 2026/)
  const multiDay = { ...campaign().schedule, endsAt: '2026-10-21T01:00:00+08:00' }
  const formatted = formatCampaignSchedule(multiDay)
  assert.match(formatted, /21 Oct 2026|Oct 21, 2026/)
  assert.match(formatted, /Asia\/Manila/)
  for (const value of [null, { ...multiDay, timeZone: 'invalid' }, { ...multiDay, startsAt: '2026-10-19T16:30:00' }, { ...multiDay, endsAt: multiDay.startsAt }]) {
    assert.equal(formatCampaignSchedule(value), null)
  }
})

test('empty, trimmed no-results, unavailable and authorization states remain distinct', () => {
  const empty = { status: 'success', data: { ...feed(), campaigns: [] } }
  assert.equal(feedViewState(empty, initialFeedCriteria), 'empty')
  assert.equal(feedViewState(empty, { query: '  ', category: '' }), 'empty')
  assert.equal(feedViewState(empty, { query: '', category: 'c' }), 'no-results')
  assert.equal(feedViewState({ status: 'unavailable', data: null }, initialFeedCriteria), 'unavailable')
  assert.equal(feedViewState({ status: 'error', error: { status: 401 }, data: feed() }, initialFeedCriteria), 'signed-out')
  assert.equal(feedViewState({ status: 'error', error: { status: 403 }, data: feed() }, initialFeedCriteria), 'forbidden')
  assert.equal(feedViewState({ status: 'loading', loading: true, data: feed() }, initialFeedCriteria), 'loading')
})

test('action forwards exact real subject/context and guards repeated activations without invented success', async () => {
  let finish, calls = 0, input, options
  const subject = campaign(), refreshFeed = () => {}, scope = { id: 'current-user' }
  const action = createFeedAction((value, context) => {
    calls += 1; input = value; options = context
    return new Promise((resolve) => { finish = resolve })
  }, subject, { scope, refreshFeed })
  const pending = action.run()
  await action.run()
  assert.equal(calls, 1)
  assert.equal(action.getSnapshot().busy, true)
  assert.equal(input, subject)
  assert.equal(options.scope, scope)
  assert.equal(options.refreshFeed, refreshFeed)
  assert.equal(options.signal.aborted, false)
  finish({ id: 'ignored-response', status: 'not-used' })
  await pending
  assert.deepEqual(action.getSnapshot(), { busy: false, error: null })
  assert.equal(subject.registration.registered, 3)
})

test('action failure can retry; cancelled late success/failure cannot publish into another scope', async () => {
  let fails = true
  const action = createFeedAction(() => { if (fails) throw new ApiError('Conflict', { status: 409 }) }, campaign())
  await action.run()
  assert.equal(action.getSnapshot().error.conflict, true)
  fails = false
  await action.run()
  assert.deepEqual(action.getSnapshot(), { busy: false, error: null })
  for (const reject of [false, true]) {
    let finish, receivedSignal, published = 0
    const cancelled = createFeedAction((_, { signal }) => { receivedSignal = signal; return new Promise((resolve, fail) => { finish = reject ? fail : resolve }) }, campaign())
    cancelled.subscribe(() => { published += 1 })
    const pending = cancelled.run()
    cancelled.cancel()
    assert.equal(receivedSignal.aborted, true)
    finish(new Error('Late result'))
    await pending
    assert.equal(published, 1)
  }
})

test('missing callbacks do nothing and non-Error rejection remains actionable', async () => {
  const missing = createFeedAction(undefined, campaign())
  await missing.run()
  assert.deepEqual(missing.getSnapshot(), { busy: false, error: null })
  const failed = createFeedAction(() => Promise.reject(null), campaign())
  await failed.run()
  assert.equal(failed.getSnapshot().error.code, 'REQUEST_FAILED')
})
