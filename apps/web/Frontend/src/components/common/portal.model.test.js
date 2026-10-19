import assert from 'node:assert/strict'
import test from 'node:test'
import { portalNavigation, roleDestination } from './portal.context.js'

test('destinations preserve public, Student, Council and Admin route namespaces', () => {
  assert.equal(roleDestination(null), '/')
  assert.equal(roleDestination({ role: 'unknown' }), '/')
  for (const [role, path] of [['student', '/news-feed'], ['admin', '/admin'], ['council', '/council']]) assert.equal(roleDestination({ role }), path)
})

test('membership review navigation requires both Council identity and an explicit capability', () => {
  for (const role of ['student', 'admin', 'council']) {
    const auth = { status: 'authenticated', user: { id: 'test-user', role }, capabilities: { canReviewApplications: true } }
    assert.equal(portalNavigation(auth).some(link => link.to === '/council/applications'), role === 'council')
    assert.deepEqual(portalNavigation({ ...auth, status: 'signed-out' }), [])
  }
  assert(!portalNavigation({ status: 'authenticated', user: { role: 'council' }, capabilities: { canReviewApplications: 'true' } }).some(link => link.to === '/council/applications'))
})
