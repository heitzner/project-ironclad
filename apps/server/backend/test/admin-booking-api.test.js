import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { createDemoData } from '../src/data/demoData.js';
import { InMemoryBookingRepository } from '../src/repositories/inMemoryBookingRepository.js';

function createSettings(connectionState = 'connected') {
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
      all_day: [
        { start: '07:00', end: '12:00' },
        { start: '13:00', end: '18:00' },
      ],
    },
    admin: {
      connectionState,
      sessionHeader: 'x-ironclad-test-session',
      testSessionId: 'admin-demo',
      nonAdminSessionId: 'student-demo',
      requestLimit: 20,
      requestLimitMax: 100,
      decisionReasonMaxLength: 500,
    },
  };
}

const adminHeaders = { 'x-ironclad-test-session': 'admin-demo' };

async function withApi(run, connectionState = 'connected') {
  const settings = createSettings(connectionState);
  const repository = new InMemoryBookingRepository(createDemoData(settings.demoWeekStart));
  const server = createApp({ repository, settings }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`, repository);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function json(response) {
  const body = await response.json();
  return { status: response.status, body };
}

function adminGet(url) {
  return fetch(url, { headers: adminHeaders });
}

function adminDecision(baseUrl, reservationId, action, reason) {
  const options = {
    method: 'POST',
    headers: { ...adminHeaders },
  };
  if (reason !== undefined) {
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify({ reason });
  }
  return fetch(`${baseUrl}/admin/booking-requests/${reservationId}/${action}`, options);
}

test('all admin endpoints enforce the test ADMIN session', async () => {
  await withApi(async (baseUrl) => {
    const missing = await json(await fetch(`${baseUrl}/admin/session`));
    assert.equal(missing.status, 401);
    assert.equal(missing.body.error.code, 'ADMIN_SESSION_REQUIRED');

    const nonAdmin = await json(await fetch(`${baseUrl}/admin/booking-requests`, {
      headers: { 'x-ironclad-test-session': 'student-demo' },
    }));
    assert.equal(nonAdmin.status, 403);
    assert.equal(nonAdmin.body.error.code, 'ADMIN_ROLE_REQUIRED');

    const invalid = await json(await fetch(`${baseUrl}/admin/session`, {
      headers: { 'x-ironclad-test-session': 'unknown' },
    }));
    assert.equal(invalid.status, 401);
  });
});

test('GET /admin/session returns the mapped admin session and ISO server time', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await adminGet(`${baseUrl}/admin/session`));
    assert.equal(result.status, 200);
    assert.equal(result.body.data.full_name, 'Test Administrator');
    assert.equal(result.body.data.role, 'ADMIN');
    assert.equal(result.body.data.session_label, 'Test session');
    assert.ok(!Number.isNaN(Date.parse(result.body.data.server_time)));
  });
});

test('admin venue overview filters search and occupancy with matching summaries', async () => {
  await withApi(async (baseUrl) => {
    const occupied = await json(await adminGet(
      `${baseUrl}/admin/room-bookings/venues?date=2026-10-20&occupancy=occupied`,
    ));
    assert.equal(occupied.status, 200);
    assert.equal(occupied.body.meta.connection_state, 'connected');
    assert.equal(occupied.body.meta.total_count, 1);
    assert.equal(occupied.body.data[0].room_code, 'Room 201');
    assert.deepEqual(occupied.body.meta.summary, {
      available: 0,
      occupied: 1,
      unavailable: 0,
    });

    const search = await json(await adminGet(
      `${baseUrl}/admin/room-bookings/venues?date=2026-10-20&q=oscilloscopes`,
    ));
    assert.equal(search.body.meta.total_count, 1);
    assert.equal(search.body.data[0].room_code, 'Room 102');

    const unavailable = await json(await adminGet(
      `${baseUrl}/admin/room-bookings/venues?date=2026-10-20&q=network&occupancy=unavailable`,
    ));
    assert.equal(unavailable.body.data[0].room_code, 'Room 203');
  });
});

test('booking request filters and counts cover search, decision, occupancy, and room', async () => {
  await withApi(async (baseUrl) => {
    const all = await json(await adminGet(`${baseUrl}/admin/booking-requests`));
    assert.equal(all.body.meta.total_count, 6);
    assert.deepEqual(all.body.meta.decision_counts, {
      pending: 2,
      approved: 2,
      rejected: 2,
    });

    const search = await json(await adminGet(
      `${baseUrl}/admin/booking-requests?q=Bianca`,
    ));
    assert.equal(search.body.meta.total_count, 2);
    assert.deepEqual(search.body.meta.decision_counts, {
      pending: 0,
      approved: 1,
      rejected: 1,
    });

    const pending = await json(await adminGet(
      `${baseUrl}/admin/booking-requests?decision=pending`,
    ));
    assert.equal(pending.body.meta.total_count, 2);
    assert.ok(pending.body.data.every(
      (request) => request.confirmation.available_actions.join(',') === 'approve,reject',
    ));

    const occupied = await json(await adminGet(
      `${baseUrl}/admin/booking-requests?occupancy=occupied`,
    ));
    assert.deepEqual(occupied.body.data.map((request) => request.reservation_id), [
      'RES-DEMO-0001',
    ]);

    const room = await json(await adminGet(
      `${baseUrl}/admin/booking-requests?room_code=Room%20104`,
    ));
    assert.equal(room.body.meta.total_count, 1);
    assert.equal(room.body.data[0].reservation_id, 'RES-DEMO-0004');
  });
});

test('booking request sorting and pagination are server-side', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await adminGet(
      `${baseUrl}/admin/booking-requests?sort=date&limit=2&offset=1`,
    ));
    assert.equal(result.body.meta.total_count, 6);
    assert.equal(result.body.meta.limit, 2);
    assert.equal(result.body.meta.offset, 1);
    assert.deepEqual(result.body.data.map((request) => request.reservation_id), [
      'RES-DEMO-0005',
      'RES-DEMO-0004',
    ]);
  });
});

test('request detail returns requester, venue, confirmation, and live conflict check', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await adminGet(
      `${baseUrl}/admin/booking-requests/RES-DEMO-0001`,
    ));
    assert.equal(result.status, 200);
    assert.equal(result.body.data.requester.student_id, '2022-10892');
    assert.equal(result.body.data.venue.name, 'Computer Science Lab 1');
    assert.equal(result.body.data.conflict_check, true);
    assert.deepEqual(result.body.data.confirmation.available_actions, ['approve', 'reject']);

    const missing = await json(await adminGet(
      `${baseUrl}/admin/booking-requests/RES-UNKNOWN`,
    ));
    assert.equal(missing.status, 404);
  });
});

test('approve records the decision and becomes a locked student-side occupancy entry', async () => {
  await withApi(async (baseUrl, repository) => {
    const logsBefore = repository.listDecisionLogs().length;
    const approved = await json(await adminDecision(
      baseUrl,
      'RES-DEMO-0001',
      'approve',
      'Schedule verified by admin',
    ));
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.decision, 'approved');
    assert.equal(approved.body.data.confirmation.decided_by, 'Test Administrator');
    assert.equal(
      approved.body.data.confirmation.decision_reason,
      'Schedule verified by admin',
    );
    assert.deepEqual(approved.body.data.confirmation.available_actions, []);
    assert.equal(approved.body.data.conflict_check, false);

    const occupancy = await json(await fetch(
      `${baseUrl}/venues/Room%20201/occupancy?date=2026-10-20&at_time=15:30`,
    ));
    assert.equal(occupancy.body.data.current_session.status_label, 'Locked • Until 04:30 PM');
    assert.equal(repository.listDecisionLogs().length, logsBefore + 1);
    assert.equal(repository.listDecisionLogs().at(-1).action, 'approved');
  });
});

test('approval re-validates conflicts and leaves the pending decision unchanged', async () => {
  await withApi(async (baseUrl, repository) => {
    repository.addScheduleEntry({
      venue_id: 'Room 201',
      date: '2026-10-20',
      start_time: '15:00',
      end_time: '16:30',
      title: 'Emergency MIS Maintenance',
      entry_type: 'lab_activity',
      instructor_name: null,
      state: 'occupied',
      locked_by: null,
      is_demo: false,
      dataset_label: null,
    });
    const result = await json(await adminDecision(
      baseUrl,
      'RES-DEMO-0001',
      'approve',
      'Attempt approval',
    ));
    assert.equal(result.status, 409);
    assert.equal(result.body.error.code, 'SLOT_CONFLICT');
    assert.equal(repository.findReservation('RES-DEMO-0001').decision, 'pending');
  });
});

test('reject releases the hold and immediately changes student utilization and vacancy', async () => {
  await withApi(async (baseUrl, repository) => {
    const beforeVenue = await json(await fetch(
      `${baseUrl}/venues/Room%20104?date=2026-10-23&period=all_day`,
    ));
    const rejected = await json(await adminDecision(
      baseUrl,
      'RES-DEMO-0004',
      'reject',
    ));
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.data.decision, 'rejected');
    assert.equal(rejected.body.data.confirmation.decision_reason, null);

    const afterVenue = await json(await fetch(
      `${baseUrl}/venues/Room%20104?date=2026-10-23&period=all_day`,
    ));
    assert.equal(beforeVenue.body.data.utilization_percent, 56);
    assert.equal(afterVenue.body.data.utilization_percent, 41);

    const vacancy = await json(await fetch(
      `${baseUrl}/venues/Room%20104/vacancy?date=2026-10-23`,
    ));
    assert.equal(vacancy.body.data.full_vacancy_hours, 10.4);
    assert.equal(repository.listDecisionLogs().at(-1).action, 'rejected');
  });
});

test('approved and rejected decisions are final', async () => {
  await withApi(async (baseUrl) => {
    const approvedAgain = await json(await adminDecision(
      baseUrl,
      'RES-DEMO-0002',
      'approve',
    ));
    assert.equal(approvedAgain.status, 409);
    assert.equal(approvedAgain.body.error.code, 'RESERVATION_NOT_PENDING');

    const rejectedAgain = await json(await adminDecision(
      baseUrl,
      'RES-DEMO-0003',
      'reject',
    ));
    assert.equal(rejectedAgain.status, 409);
  });
});

test('not_connected admin lists return no records and no totals', async () => {
  await withApi(async (baseUrl) => {
    const venues = await json(await adminGet(
      `${baseUrl}/admin/room-bookings/venues?date=2026-10-20`,
    ));
    assert.deepEqual(venues.body, {
      data: [],
      meta: { connection_state: 'not_connected' },
    });

    const requests = await json(await adminGet(`${baseUrl}/admin/booking-requests`));
    assert.deepEqual(requests.body, {
      data: [],
      meta: { connection_state: 'not_connected' },
    });
  }, 'not_connected');
});
