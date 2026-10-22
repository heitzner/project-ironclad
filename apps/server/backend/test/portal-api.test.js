import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { createPortalDemoData } from '../src/data/portalDemoData.js';
import { InMemoryPortalRepository } from '../src/repositories/inMemoryPortalRepository.js';

async function withPortalApi(run) {
  const portalRepository = new InMemoryPortalRepository(createPortalDemoData('2026-10-19'));
  const server = createApp({ portalRepository, settings: config }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function request(baseUrl, path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

async function signIn(baseUrl, studentId, password) {
  const result = await request(baseUrl, '/auth/sign-in', {
    method: 'POST', body: { studentId, password },
  });
  assert.equal(result.status, 200);
  return result.body;
}

test('portal session and state expose role-filtered API data without account secrets', async () => {
  await withPortalApi(async (baseUrl) => {
    const publicState = await request(baseUrl, '/portal/state');
    assert.equal(publicState.status, 200);
    assert.equal(publicState.body.posts.length, 7);
    assert.equal(publicState.body.rooms.length, 16);
    assert.equal('accounts' in publicState.body, false);
    assert.equal(publicState.body.directory.length, 0);

    const student = await signIn(baseUrl, '20241200-C', 'Student@123');
    assert.equal(student.user.role, 'student');
    assert.equal(student.capabilities.canBook, true);
    const studentState = await request(baseUrl, '/portal/state', { token: student.token });
    assert.equal(studentState.body.session.user.id, 'test-student');
    assert(studentState.body.bookings.every((booking) => booking.requesterId === 'test-student'));
    assert.equal(studentState.body.directory.length, 1);

    const admin = await signIn(baseUrl, '20240001-A', 'Admin@123');
    const adminState = await request(baseUrl, '/portal/state', { token: admin.token });
    assert.equal(adminState.body.directory.length, 9);
    assert(adminState.body.bookings.length > studentState.body.bookings.length);
  });
});

test('students create room requests and conflicts are rejected for the same slot', async () => {
  await withPortalApi(async (baseUrl) => {
    const student = await signIn(baseUrl, '20241200-C', 'Student@123');
    const body = {
      roomId: '303', date: '2026-10-21', start: 780, end: 840,
      purpose: 'Student organization planning', requesterId: 'test-student',
    };
    const created = await request(baseUrl, '/portal/bookings', {
      token: student.token, method: 'POST', body,
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, 'pending');
    assert(created.body.state.bookings.some((booking) => booking.id === created.body.data.id));

    const conflict = await request(baseUrl, '/portal/bookings', {
      token: student.token, method: 'POST', body,
    });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.code, 'CONFLICT');

    const occupied = await request(baseUrl, '/portal/bookings', {
      token: student.token,
      method: 'POST',
      body: { ...body, roomId: '303', start: 600, end: 660 },
    });
    assert.equal(occupied.status, 409);
  });
});

test('feed submissions, review decisions, profiles, and admin booking decisions persist in memory', async () => {
  await withPortalApi(async (baseUrl) => {
    const student = await signIn(baseUrl, '20241200-C', 'Student@123');
    const application = await request(baseUrl, '/portal/posts/council-BSCS/submissions', {
      token: student.token,
      method: 'POST',
      body: { contact: 'student.one@campus.example.test', answers: ['I want to serve.', 'Planning and communication.'] },
    });
    assert.equal(application.status, 201);
    assert.equal(application.body.data.status, 'pending');

    const profile = await request(baseUrl, '/portal/profiles/test-student', {
      token: student.token,
      method: 'PATCH',
      body: { id: 'test-student', email: 'student.one@campus.example.test', displayName: 'Student One', avatarUrl: '' },
    });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.state.profiles['test-student'].displayName, 'Student One');

    const admin = await signIn(baseUrl, '20240001-A', 'Admin@123');
    const reviewed = await request(baseUrl, `/portal/applications/${application.body.data.id}/decision`, {
      token: admin.token, method: 'POST', body: { status: 'accepted' },
    });
    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.data.status, 'accepted');

    const pending = reviewed.body.state.bookings.find((booking) => booking.status === 'pending');
    assert(pending);
    const decided = await request(baseUrl, `/portal/bookings/${pending.id}/decision`, {
      token: admin.token, method: 'POST', body: { status: 'declined', reason: 'Use another available room.' },
    });
    assert.equal(decided.status, 200);
    assert.equal(decided.body.data.status, 'declined');
  });
});

test('verification receipts protect email and password changes while reset requests stay privacy-safe', async () => {
  await withPortalApi(async (baseUrl) => {
    const student = await signIn(baseUrl, '20241200-C', 'Student@123');
    const challenge = await request(baseUrl, '/auth/verifications', {
      token: student.token,
      method: 'POST',
      body: { email: 'student.one@campus.example.test', purpose: 'password-change' },
    });
    assert.equal(challenge.status, 201);
    assert.equal(challenge.body.sent, true);

    const verified = await request(baseUrl, '/auth/verifications/confirm', {
      token: student.token,
      method: 'POST',
      body: {
        challengeId: challenge.body.id,
        code: '123456',
        email: 'student.one@campus.example.test',
        purpose: 'password-change',
      },
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.verified, true);

    const changed = await request(baseUrl, '/auth/password', {
      token: student.token,
      method: 'POST',
      body: {
        currentPassword: 'Student@123',
        newPassword: 'Student@456',
        verificationReceipt: verified.body.receipt,
      },
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.confirmed, true);

    const oldPassword = await request(baseUrl, '/auth/sign-in', {
      method: 'POST', body: { studentId: '20241200-C', password: 'Student@123' },
    });
    assert.equal(oldPassword.status, 401);
    await signIn(baseUrl, '20241200-C', 'Student@456');

    const reset = await request(baseUrl, '/auth/password-reset', {
      method: 'POST', body: { email: 'unknown@example.test' },
    });
    assert.equal(reset.status, 200);
    assert.equal(reset.body.confirmed, true);
    assert.equal(reset.body.message.includes('belongs to an account'), true);
  });
});
