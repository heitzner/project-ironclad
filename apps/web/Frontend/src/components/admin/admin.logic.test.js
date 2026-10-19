import test from 'node:test'
import assert from 'node:assert/strict'
import { isAdmin, validateDecision, validateEvent, validateRoleChange } from './admin.logic.js'

// Test-local records exercise validation only; they are never imported by the UI.
const now = new Date('2030-01-01T00:00:00Z')

test('administrator checks reject signed out, non-admin, and disabled accounts', () => {
  assert.equal(isAdmin(null), false)
  assert.equal(isAdmin({ id: 'actor', role: 'student' }), false)
  assert.equal(isAdmin({ id: 'actor', role: 'admin', disabled: true }), false)
  assert.equal(isAdmin({ role: 'admin' }), false)
  assert.equal(isAdmin({ id: 'actor', role: 'admin' }), true)
})

test('booking decisions require pending requests, valid future times, and denial reasons', () => {
  const booking = { id: 'request', roomId: 'room', status: 'pending', startsAt: '2030-01-02T09:00:00+08:00', endsAt: '2030-01-02T10:00:00+08:00' }
  assert.equal(validateDecision(booking, 'approved', '', [], now), '')
  assert.notEqual(validateDecision({ ...booking, status: 'approved' }, 'denied', 'Reason', [], now), '')
  assert.notEqual(validateDecision(booking, 'denied', '   ', [], now), '')
  assert.equal(validateDecision(booking, 'denied', 'Unavailable', [], now), '')
  assert.notEqual(validateDecision({ ...booking, endsAt: booking.startsAt }, 'approved', '', [], now), '')
  assert.notEqual(validateDecision({ ...booking, startsAt: '2029-01-01' }, 'approved', '', [], now), '')
})

test('approved overlaps block approval but adjacent bookings and other rooms do not', () => {
  const request = { id: 'new', roomId: 'one', status: 'pending', startsAt: '2030-01-02T09:00:00Z', endsAt: '2030-01-02T10:00:00Z' }
  const existing = { ...request, id: 'existing', status: 'approved' }
  assert.notEqual(validateDecision(request, 'approved', '', [existing], now), '')
  assert.equal(validateDecision(request, 'approved', '', [{ ...existing, roomId: 'two' }], now), '')
  assert.equal(validateDecision(request, 'approved', '', [{ ...existing, startsAt: request.endsAt, endsAt: '2030-01-02T11:00:00Z' }], now), '')
})

test('event forms reject blank content and invalid, reversed, or past schedules', () => {
  const event = { title: 'Title', description: 'Description', venueId: 'venue', startsAt: '2030-02-01T09:00:00+08:00', endsAt: '2030-02-01T10:00:00+08:00' }
  assert.equal(validateEvent(event, now), '')
  for (const invalid of [{ title: ' ' }, { description: '' }, { venueId: '' }, { startsAt: 'invalid' }, { endsAt: event.startsAt }, { startsAt: '2029-01-01' }]) assert.notEqual(validateEvent({ ...event, ...invalid }, now), '')
})

test('council roles reject self promotion, admin editing, unapproved accounts, and foreign roles', () => {
  const actor = { id: 'actor', role: 'admin' }
  const member = { id: 'member', role: 'student', status: 'active' }
  const roles = [{ id: 'council-role', scope: 'council' }, { id: 'admin-role', scope: 'admin' }]
  assert.equal(validateRoleChange(actor, member, 'council-role', roles), '')
  assert.notEqual(validateRoleChange(actor, actor, 'council-role', roles), '')
  assert.notEqual(validateRoleChange(actor, { ...member, role: 'admin' }, '', roles), '')
  assert.notEqual(validateRoleChange(actor, { ...member, status: 'pending' }, 'council-role', roles), '')
  assert.notEqual(validateRoleChange(actor, member, 'admin-role', roles), '')
  assert.notEqual(validateRoleChange(member, member, 'council-role', roles), '')
  assert.equal(validateRoleChange(actor, { ...member, councilRoleId: 'council-role' }, '', roles), '')
})
