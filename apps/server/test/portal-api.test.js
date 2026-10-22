import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createApp } from '../src/app.js'

let server
let base

before(() => new Promise(resolve => {
  const created = createApp({ emailService: { deliveryEnabled: false, sendVerificationCode: async () => ({ delivered: false }) } })
  server = created.app.listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}/api`
    resolve()
  })
}))
after(() => new Promise(resolve => server.close(resolve)))
beforeEach(async () => { await fetch(`${base}/test/reset`, { method: 'POST' }) })

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json()
  return { status: response.status, data }
}

async function signIn(studentId, password) {
  const response = await request('auth/sign-in', { method: 'POST', body: { studentId, password } })
  assert.equal(response.status, 200, JSON.stringify(response.data))
  return response.data
}

test('health and all thirteen seeded credentials are usable', async () => {
  const credentials = [
    ['20240001-A', 'Admin@123'], ['20240003-A', 'AdminVP@123'], ['20240004-A', 'AdminSec@123'], ['20240005-A', 'AdminTreas@123'], ['20240006-A', 'AdminAudit@123'],
    ['20240002-C', 'Council@123'], ['20240003-C', 'CouncilVP@123'], ['20240004-C', 'CouncilSec@123'], ['20240005-C', 'CouncilTreas@123'], ['20240006-C', 'CouncilAudit@123'],
    ['20241200-C', 'Student@123'], ['20241201-C', 'Student2@123'], ['20241202-C', 'Student3@123'],
  ]
  const health = await request('health')
  assert.equal(health.data.status, 'ok')
  for (const [studentId, password] of credentials) assert.ok((await signIn(studentId, password)).token)
})

test('signed-out state exposes feed data without leaking the account directory', async () => {
  const state = (await request('portal/state')).data
  assert.equal(state.posts.length, 9)
  assert.deepEqual(state.directory, [])
  assert.deepEqual(state.members, {})
  assert.deepEqual(state.profiles, {})
})

test('student booking is pending, conflicting intervals are rejected, and admin can approve', async () => {
  const student = await signIn('20241200-C', 'Student@123')
  const state = (await request('portal/state', { token: student.token })).data
  const date = state.dateOptions[1]
  const input = { requesterId: student.user.id, roomId: '303', date, shift: 'morning', start: 480, end: 600, purpose: 'Student organization planning' }
  const created = await request('portal/bookings', { token: student.token, method: 'POST', body: input })
  assert.equal(created.status, 201)
  assert.equal(created.data.data.status, 'pending')
  const conflict = await request('portal/bookings', { token: student.token, method: 'POST', body: { ...input, start: 540, end: 630 } })
  assert.equal(conflict.status, 409)
  const admin = await signIn('20240001-A', 'Admin@123')
  const approved = await request(`portal/bookings/${created.data.data.id}/decision`, { token: admin.token, method: 'POST', body: { status: 'approved' } })
  assert.equal(approved.data.data.status, 'approved')
  const activity = (await request('portal/state', { token: student.token })).data
  assert.equal(activity.bookings[0].status, 'approved')
})

test('approval revalidates a room closure created after the pending request', async () => {
  const student = await signIn('20241200-C', 'Student@123')
  const state = (await request('portal/state', { token: student.token })).data
  const input = { requesterId: student.user.id, roomId: '303', date: state.dateOptions[1], shift: 'morning', start: 480, end: 600, purpose: 'Planning session' }
  const created = await request('portal/bookings', { token: student.token, method: 'POST', body: input })
  const admin = await signIn('20240001-A', 'Admin@123')
  const closure = await request('portal/closures', { token: admin.token, method: 'POST', body: { roomId: '303', mode: 'interval', date: input.date, start: 480, end: 600, reason: 'Emergency inspection' } })
  assert.equal(closure.status, 201)
  const decision = await request(`portal/bookings/${created.data.data.id}/decision`, { token: admin.token, method: 'POST', body: { status: 'approved' } })
  assert.equal(decision.status, 409)
})

test('accepted council application grants access to the existing active session', async () => {
  const student = await signIn('20241200-C', 'Student@123')
  const submitted = await request('portal/posts/council-BSCS/submissions', { token: student.token, method: 'POST', body: { contact: 'student.one@campus.example.test', answers: ['I want to serve.', 'I organize student activities.'] } })
  assert.equal(submitted.status, 201)
  const council = await signIn('20240002-C', 'Council@123')
  const accepted = await request(`portal/applications/${submitted.data.data.id}/decision`, { token: council.token, method: 'POST', body: { status: 'accepted', reason: 'Qualified applicant' } })
  assert.equal(accepted.data.data.status, 'accepted')
  const sameSession = await request('auth/session', { token: student.token })
  assert.equal(sameSession.data.user.role, 'council')
  assert.equal(sameSession.data.user.position, 'Member')
  assert.equal(sameSession.data.capabilities.publish, true)
})

test('treasurer and auditor cannot manage members while presidential succession updates both sessions', async () => {
  const treasurer = await signIn('20240005-C', 'CouncilTreas@123')
  const forbidden = await request('portal/members/test-council-auditor/position', { token: treasurer.token, method: 'PATCH', body: { position: 'Member' } })
  assert.equal(forbidden.status, 403)
  const president = await signIn('20240002-C', 'Council@123')
  const successor = await signIn('20240003-C', 'CouncilVP@123')
  const nomination = await request('portal/handovers', { token: president.token, method: 'POST', body: { memberId: 'test-council-vp' } })
  assert.equal(nomination.status, 201)
  const accepted = await request(`portal/handovers/${nomination.data.data.id}/respond`, { token: successor.token, method: 'POST', body: { action: 'accept' } })
  assert.equal(accepted.data.data.status, 'accepted')
  assert.equal((await request('auth/session', { token: successor.token })).data.user.position, 'President')
  assert.equal((await request('auth/session', { token: president.token })).data.user.position, 'Member')
})

test('mock OTP gates signup and password changes', async () => {
  const challenge = await request('auth/verifications', { method: 'POST', body: { email: 'new.student@campus.example.test', purpose: 'signup' } })
  assert.equal(challenge.data.sent, true)
  const verified = await request('auth/verifications/confirm', { method: 'POST', body: { challengeId: challenge.data.id, code: '123456', email: 'new.student@campus.example.test', purpose: 'signup' } })
  const registered = await request('auth/register', { method: 'POST', body: { studentId: '20249999-C', password: 'NewUser@123', name: 'New Student', email: 'new.student@campus.example.test', course: 'BSCS', yearLevel: '1', section: 'A', verificationReceipt: verified.data.receipt } })
  assert.equal(registered.status, 201)
  assert.equal(registered.data.confirmed, true)
  assert.equal((await signIn('20249999-C', 'NewUser@123')).user.role, 'student')
})

test('verified email and password updates persist for the current account', async () => {
  const student = await signIn('20241200-C', 'Student@123')
  const email = 'updated.student@campus.example.test'
  const emailChallenge = await request('auth/verifications', { token: student.token, method: 'POST', body: { email, purpose: 'email-change' } })
  const emailReceipt = await request('auth/verifications/confirm', { token: student.token, method: 'POST', body: { challengeId: emailChallenge.data.id, code: '123456', email, purpose: 'email-change' } })
  const saved = await request(`portal/profiles/${student.user.id}`, { token: student.token, method: 'PATCH', body: { id: student.user.id, displayName: 'Updated Student', email, avatarUrl: '', emailVerificationReceipt: emailReceipt.data.receipt } })
  assert.equal(saved.data.data.confirmed, true)
  const passwordChallenge = await request('auth/verifications', { token: student.token, method: 'POST', body: { email, purpose: 'password-change' } })
  const passwordReceipt = await request('auth/verifications/confirm', { token: student.token, method: 'POST', body: { challengeId: passwordChallenge.data.id, code: '123456', email, purpose: 'password-change' } })
  const changed = await request('auth/password', { token: student.token, method: 'POST', body: { currentPassword: 'Student@123', newPassword: 'Student@456', verificationReceipt: passwordReceipt.data.receipt } })
  assert.equal(changed.data.confirmed, true)
  assert.equal((await request('auth/sign-in', { method: 'POST', body: { studentId: '20241200-C', password: 'Student@123' } })).status, 401)
  assert.equal((await signIn('20241200-C', 'Student@456')).user.name, 'Updated Student')
})

test('manager event publishing, immediate registration, dashboard, and archive exports work', async () => {
  const council = await signIn('20240002-C', 'Council@123')
  const state = (await request('portal/state', { token: council.token })).data
  const date = state.dateOptions.at(-1)
  const published = await request('portal/posts', { token: council.token, method: 'POST', body: { kind: 'event', title: 'API QA Event', description: 'End-to-end registration QA event.', startsAt: `${date}T10:00:00+08:00`, endsAt: `${date}T12:00:00+08:00`, venue: 'Room 303', capacity: 20, registrationKind: 'individual' } })
  assert.equal(published.status, 201)
  const student = await signIn('20241201-C', 'Student2@123')
  const registration = await request(`portal/posts/${published.data.data.id}/submissions`, { token: student.token, method: 'POST', body: { contact: 'student.two@campus.example.test' } })
  assert.equal(registration.data.data.status, 'registered')
  const managerState = (await request('portal/state', { token: council.token })).data
  assert.ok(managerState.registrations.some(item => item.id === registration.data.data.id))
  const admin = await signIn('20240001-A', 'Admin@123')
  const dashboard = await request('dashboard', { token: admin.token })
  assert.equal(dashboard.status, 200)
  const archive = await fetch(`${base}/archive/export?format=csv`, { headers: { Authorization: `Bearer ${admin.token}` } })
  assert.equal(archive.status, 200)
  assert.match(archive.headers.get('content-type'), /text\/csv/)
  assert.match(await archive.text(), /Technovate Hackathon/)
})

test('QA reset restores defaults and revokes active sessions', async () => {
  const student = await signIn('20241200-C', 'Student@123')
  const reset = await request('test/reset', { method: 'POST' })
  assert.equal(reset.data.accountCount, 13)
  assert.equal((await request('auth/session', { token: student.token })).status, 401)
})
