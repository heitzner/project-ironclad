import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { createDemoData } from '../src/data/demoData.js';
import { InMemoryBookingRepository } from '../src/repositories/inMemoryBookingRepository.js';

function settings() {
  return {
    timeZone: 'Asia/Manila',
    approverRole: 'MIS Administrator',
    purposeMaxLength: 200,
    minSlotMinutes: 30,
    defaultStudentId: '2022-10892',
    demoWeekStart: '2026-10-19',
    operationalWindow: { start: '07:00', end: '21:30' },
    periods: {
      morning: [{ start: '07:00', end: '12:00' }],
      evening: [{ start: '13:00', end: '18:00' }],
      all_day: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
    },
    cors: { allowedOrigins: ['http://localhost:5173'], allowLocalDevelopmentOrigins: true },
    admin: {
      connectionState: 'connected',
      sessionHeader: 'x-ironclad-test-session',
      testSessionId: 'admin-demo',
      nonAdminSessionId: 'student-demo',
      requestLimit: 20,
      requestLimitMax: 100,
      decisionReasonMaxLength: 500,
    },
  };
}

const headers = { 'x-ironclad-test-session': 'admin-demo' };

async function withApi(run) {
  const activeSettings = settings();
  const repository = new InMemoryBookingRepository(createDemoData(activeSettings.demoWeekStart));
  const server = createApp({ repository, settings: activeSettings }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function json(response) {
  return { status: response.status, body: await response.json() };
}

function write(url, method, body) {
  return fetch(url, {
    method,
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('admin portal lists seeded events, eligible members, and council roles', async () => {
  await withApi(async (baseUrl) => {
    const [events, members, roles] = await Promise.all([
      json(await fetch(`${baseUrl}/admin/events`, { headers })),
      json(await fetch(`${baseUrl}/admin/members`, { headers })),
      json(await fetch(`${baseUrl}/admin/council-roles`, { headers })),
    ]);
    assert.equal(events.status, 200);
    assert.equal(events.body.meta.total_count, 2);
    assert.equal(events.body.data[0].venue_name, 'Seminar & Conference Room');
    assert.equal(members.body.meta.total_count, 3);
    assert.equal(roles.body.meta.total_count, 3);
    assert.ok(roles.body.data.every((role) => role.scope === 'council'));
  });
});

test('admin creates, edits, and completes an event with version checks', async () => {
  await withApi(async (baseUrl) => {
    const created = await json(await write(`${baseUrl}/admin/events`, 'POST', {
      title: 'Research Showcase',
      description: 'Student research project presentations.',
      venue_id: 'Room 301',
      starts_at: '2026-10-25T13:00:00+08:00',
      ends_at: '2026-10-25T14:00:00+08:00',
    }));
    assert.equal(created.status, 201);
    assert.equal(created.body.data.version, 1);

    const eventId = created.body.data.event_id;
    const edited = await json(await write(`${baseUrl}/admin/events/${eventId}`, 'PUT', {
      title: 'Research Showcase and Forum',
      description: 'Student research project presentations and open forum.',
      venue_id: 'Room 301',
      starts_at: '2026-10-25T14:00:00+08:00',
      ends_at: '2026-10-25T15:00:00+08:00',
      version: 1,
    }));
    assert.equal(edited.status, 200);
    assert.equal(edited.body.data.version, 2);

    const stale = await json(await write(`${baseUrl}/admin/events/${eventId}`, 'PUT', {
      title: 'Stale edit',
      description: 'This edit should be rejected.',
      venue_id: 'Room 301',
      starts_at: '2026-10-25T15:00:00+08:00',
      ends_at: '2026-10-25T16:00:00+08:00',
      version: 1,
    }));
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, 'VERSION_CONFLICT');

    const completed = await json(await write(`${baseUrl}/admin/events/${eventId}/complete`, 'POST', { version: 2 }));
    assert.equal(completed.status, 200);
    assert.equal(completed.body.data.status, 'completed');
    assert.equal(completed.body.data.version, 3);
  });
});

test('event writes reject venue conflicts and unavailable venues', async () => {
  await withApi(async (baseUrl) => {
    const conflict = await json(await write(`${baseUrl}/admin/events`, 'POST', {
      title: 'Overlapping Event',
      description: 'Uses the same room and time as a seeded event.',
      venue_id: 'Room 104',
      starts_at: '2026-10-22T14:00:00+08:00',
      ends_at: '2026-10-22T16:00:00+08:00',
    }));
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.code, 'EVENT_VENUE_CONFLICT');

    const unavailable = await json(await write(`${baseUrl}/admin/events`, 'POST', {
      title: 'Unavailable Venue Event',
      description: 'This venue is locked by the dean.',
      venue_id: 'Room 203',
      starts_at: '2026-10-25T13:00:00+08:00',
      ends_at: '2026-10-25T14:00:00+08:00',
    }));
    assert.equal(unavailable.status, 422);
  });
});

test('admin changes a council assignment and stale changes are rejected', async () => {
  await withApi(async (baseUrl) => {
    const updated = await json(await write(
      `${baseUrl}/admin/members/2021-10417/council-role`,
      'PATCH',
      { council_role_id: 'ROLE-002', version: 1 },
    ));
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.role, 'council');
    assert.equal(updated.body.data.council_role_id, 'ROLE-002');
    assert.equal(updated.body.data.version, 2);

    const stale = await json(await write(
      `${baseUrl}/admin/members/2021-10417/council-role`,
      'PATCH',
      { council_role_id: null, version: 1 },
    ));
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, 'VERSION_CONFLICT');
  });
});

test('admin browser requests receive CORS headers on fallback Vite ports', async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/events`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5174',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-ironclad-test-session',
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5174');
    assert.match(response.headers.get('access-control-allow-methods'), /PATCH/);
  });
});
