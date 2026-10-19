import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, createApiClient } from './api.js'
import { createCouncilService, councilService } from './council.service.js'
import { normalizeSession } from '../context/session.js'

test('an unconfigured connection makes no network request', async () => {
  let calls = 0
  const client = createApiClient({ baseUrl: '', fetchImpl: () => { calls += 1 } })
  await assert.rejects(client.request('agreed-path'), (error) => error.unavailable)
  assert.equal(calls, 0)
})

test('the JSON transport preserves payload, cancellation and configured base', async () => {
  const signal = new AbortController().signal
  const client = createApiClient({ baseUrl: '/configured-api/', fetchImpl: async (url, options) => {
    assert.equal(url, '/configured-api/agreed-path')
    assert.equal(options.method, 'POST')
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.signal, signal)
    assert.equal(options.headers.get('Content-Type'), 'application/json')
    assert.deepEqual(JSON.parse(options.body), { header: 'Test input' })
    return new Response(JSON.stringify({ id: 'test-post', status: 'published' }))
  } })
  assert.deepEqual(await client.request('agreed-path', { method: 'POST', json: { header: 'Test input' }, signal }), { id: 'test-post', status: 'published' })
})

test('service paths cannot replace the configured origin or escape the base', async () => {
  const client = createApiClient({ baseUrl: '/api', fetchImpl: () => assert.fail('must not fetch') })
  for (const path of ['https://example.invalid', '//example.invalid', '../elsewhere', '%2e%2e/elsewhere', 'one/../../elsewhere', 'one\\elsewhere', 'one#fragment', '', '%', ' leading-space', 'one%00two']) {
    await assert.rejects(client.request(path), { code: 'INVALID_PATH' })
  }
})

test('malformed success never becomes saved data; empty transport responses remain null', async () => {
  const malformed = createApiClient({ baseUrl: '/api', fetchImpl: async () => new Response('<html>error</html>') })
  await assert.rejects(malformed.request('agreed-path'), { code: 'INVALID_RESPONSE' })
  const empty = createApiClient({ baseUrl: '/api', fetchImpl: async () => new Response(null, { status: 204 }) })
  assert.equal(await empty.request('agreed-path'), null)
})

test('HTTP validation and conflict errors retain status and structured details', async () => {
  for (const status of [401, 403, 409, 412, 422, 500]) {
    const client = createApiClient({ baseUrl: '/api', fetchImpl: async () => new Response(JSON.stringify({ fields: { header: 'Required' } }), { status }) })
    await assert.rejects(client.request('agreed-path'), (error) => {
      assert.equal(error.status, status)
      assert.equal(error.conflict, status === 409 || status === 412)
      assert.equal(error.details.fields.header, 'Required')
      return true
    })
  }
})

test('network and abort failures remain distinct', async () => {
  const failed = createApiClient({ baseUrl: '/api', fetchImpl: async () => { throw new TypeError('offline') } })
  await assert.rejects(failed.request('agreed-path'), { code: 'NETWORK_ERROR' })
  const controller = new AbortController()
  controller.abort()
  const aborted = createApiClient({ baseUrl: '/api', fetchImpl: async () => { throw controller.signal.reason } })
  await assert.rejects(aborted.request('agreed-path', { signal: controller.signal }), { name: 'AbortError' })
})

test('every disconnected Council operation rejects instead of returning fake records or success', async () => {
  for (const operation of ['getFeed', 'getApplicationForm', 'getApplications', 'createPost', 'submitApplication', 'reviewApplication', 'exportApplications']) {
    assert.equal(councilService.supports(operation), false)
    await assert.rejects(councilService[operation](), (error) => error.unavailable)
  }
})

test('an explicit real-data adapter receives the client and abort signal unchanged', async () => {
  const controller = new AbortController()
  const client = {}
  const supplied = { council: { id: 'test-council', name: 'Test council', activeEventCount: 9 }, campaigns: [], categories: [] }
  const service = createCouncilService({ client, operations: { getFeed: async (input, context) => {
    assert.deepEqual(input, { query: 'query', category: 'category', page: 2 })
    assert.equal(context.client, client)
    assert.equal(context.signal, controller.signal)
    return supplied
  } } })
  assert.equal(await service.getFeed({ query: 'query', category: 'category', page: 2 }, { signal: controller.signal }), supplied)
  assert.equal(service.supports('getFeed'), true)
  assert.equal(service.supports('createPost'), false)
  assert.equal(supplied.council.activeEventCount, 9)
})

test('invalid reads and missing authoritative mutation outcomes fail closed', async () => {
  const operations = Object.fromEntries(['getFeed', 'getApplicationForm', 'getApplications', 'createPost', 'submitApplication', 'reviewApplication'].map((name) => [name, async () => ({})]))
  const service = createCouncilService({ operations })
  for (const operation of Object.keys(operations)) await assert.rejects(service[operation](), { code: 'INVALID_RESPONSE' })
})

test('empty data is distinct from unavailable; mutations only expose supplied facts', async () => {
  const result = { application: { id: 'test-application', status: 'accepted' } }
  const service = createCouncilService({ operations: {
    getFeed: async () => ({ council: null, campaigns: [], categories: [] }),
    getApplicationForm: async () => ({ form: null, application: null }),
    reviewApplication: async () => result,
  } })
  assert.deepEqual(await service.getFeed(), { council: null, campaigns: [], categories: [] })
  assert.deepEqual(await service.getApplicationForm(), { form: null, application: null })
  assert.equal(await service.reviewApplication({ id: 'test-application', decision: 'accept' }), result)
  assert.equal('notification' in result, false)
  assert.equal('user' in result, false)
})

test('session normalization uses real identity and only explicitly granted capabilities', () => {
  assert.equal(normalizeSession(null).user, null)
  assert.throws(() => normalizeSession(undefined), ApiError)
  assert.throws(() => normalizeSession({ user: { name: 'No ID' } }), ApiError)
  const user = { id: 'test-user', name: 'Test user', program: 'test-program', section: 'test-section' }
  const session = normalizeSession({ user, capabilities: { canApply: true, canReviewApplications: 'true', canCreatePost: false } })
  assert.equal(session.user, user)
  assert.deepEqual(session.capabilities, { canApply: true })
  assert.equal(normalizeSession({ user: { id: 'test-user', role: 'council' } }).capabilities.canReviewApplications, undefined)
})
