import assert from 'node:assert/strict'
import test from 'node:test'
import { portalNavigation, roleDestination } from './portal.context.js'

test('all three roles land on the unified News Feed; unknown identities stay public', () => {
  assert.equal(roleDestination(null), '/')
  assert.equal(roleDestination({ role: 'unknown' }), '/')
  for (const role of ['student', 'admin', 'council']) assert.equal(roleDestination({ role }), '/news-feed')
})

test('all roles can book; Admin and Council receive membership review under Task 39', () => {
  for (const role of ['student', 'admin', 'council']) {
    const auth = { status: 'authenticated', user: { id: 'test-user', role }, capabilities: { canReviewApplications: true } }
    const links = portalNavigation(auth)
    assert.equal(links.some(link => link.to === '/council/applications'), role !== 'student')
    assert(links.some(link => link.to === '/booking'))
    assert.equal(links.filter(link => /news/i.test(link.label)).length, 1)
    assert(!links.some(link => ['/events', '/council', '/council/apply'].includes(link.to)))
    assert.equal(links.some(link => link.to === '/admin'), role === 'admin')
    assert.deepEqual(portalNavigation({ ...auth, status: 'signed-out' }), [])
  }
  assert(!portalNavigation({ status: 'authenticated', user: { role: 'student' }, capabilities: { canReviewApplications: true } }).some(link => link.to === '/council/applications'))
})
