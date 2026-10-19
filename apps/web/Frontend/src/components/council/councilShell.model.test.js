import assert from 'node:assert/strict'
import test from 'node:test'
import { councilShell } from './councilShell.model.js'

const auth = { status: 'authenticated', user: { id: 'test-session-user', role: 'student', name: ' Supplied name ', program: { id: 'test-program', label: ' Supplied program ' } }, capabilities: {} }
const paths = (shell) => shell.navigationLinks.map(({ to }) => to)

test('applicants keep Student navigation and structured program labels without changing their session', () => {
  const before = structuredClone(auth)
  const shell = councilShell(auth)
  assert.equal(shell.role, 'student')
  assert.deepEqual(shell.user, { name: 'Supplied name', program: 'Supplied program', avatarUrl: undefined })
  assert.deepEqual(paths(shell), ['/news-feed', '/booking', '/archive', '/council'])
  assert.equal(shell.homeTo, '/')
  assert.deepEqual(auth, before)
})

test('Council role labels alone grant no applicant or review link', () => {
  const shell = councilShell({ ...auth, user: { ...auth.user, role: 'council' } })
  assert.deepEqual(paths(shell), ['/council'])
  assert.equal(shell.homeTo, '/council')
})

test('only explicit current-session capabilities expose application and review navigation', () => {
  const granted = { ...auth, capabilities: { canApply: true, canReviewApplications: true } }
  assert.deepEqual(paths(councilShell(granted)).slice(-2), ['/council/apply', '/council/applications'])
  const denied = councilShell({ ...auth, capabilities: { canApply: 'true', canReviewApplications: 1 } })
  assert(!paths(denied).includes('/council/apply'))
  assert(!paths(denied).includes('/council/applications'))
  assert.deepEqual(paths(councilShell({ ...granted, capabilities: {} })), paths(councilShell(auth)))
})

test('non-authenticated states hide retained identity and capability links immediately', () => {
  for (const status of ['loading', 'signed-out', 'unavailable', 'error', 'forbidden']) {
    const shell = councilShell({ ...auth, status, capabilities: { canReviewApplications: true, canApply: true } })
    assert.equal(shell.user, null)
    assert.equal(shell.role, 'public')
    assert.deepEqual(paths(shell), ['/council'])
  }
})

test('missing or malformed display fields never become invented identity or a React object child', () => {
  const shell = councilShell({ ...auth, user: { id: 'test-user', role: 'unknown', name: {}, program: { id: 'test-program' }, avatarUrl: false } })
  assert.deepEqual(shell.user, { name: undefined, program: undefined, avatarUrl: undefined })
  assert.equal(shell.role, 'public')
  assert.equal(councilShell({ ...auth, user: { ...auth.user, program: ' String program ' } }).user.program, 'String program')
})
