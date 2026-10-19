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
    calendar: { term_label: 'Term 2', week_label: 'W6' },
    operationalWindow: { start: '07:00', end: '21:30' },
    cors: { allowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'] },
    periods: {
      morning: [{ start: '07:00', end: '12:00' }],
      evening: [{ start: '13:00', end: '18:00' }],
      all_day: [{ start: '07:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
    },
    admin: {
      connectionState: 'connected', sessionHeader: 'x-ironclad-test-session', testSessionId: 'admin-demo', nonAdminSessionId: 'student-demo', requestLimit: 20, requestLimitMax: 100, decisionReasonMaxLength: 500,
    },
    council: {
      connectionState: 'connected', sessionHeader: 'x-ironclad-test-session', testSessionId: 'council-demo', nonCouncilSessionIds: ['admin-demo', 'student-demo'], requestLimit: 20, requestLimitMax: 100, endorsementMaxLength: 2000, vacantMaxPercent: 25, allocatedMinPercent: 70, examPrepEntryType: 'exam_prep', clockIso: '2026-10-19T06:15:00.000Z',
    },
  };
}

const councilHeaders = { 'x-ironclad-test-session': 'council-demo' };
const adminHeaders = { 'x-ironclad-test-session': 'admin-demo' };

async function withApi(run) {
  const activeSettings = settings();
  const repository = new InMemoryBookingRepository(createDemoData(activeSettings.demoWeekStart));
  const server = createApp({ repository, settings: activeSettings }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`, repository); }
  finally { await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))); }
}

async function json(response) { return { status: response.status, body: await response.json() }; }
const councilGet = (url) => fetch(url, { headers: councilHeaders });

function councilPost(url, body) {
  return fetch(url, { method: 'POST', headers: { ...councilHeaders, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('student catalog and admin request data are reconstructed on the shared store', async () => {
  await withApi(async (baseUrl) => {
    const venues = await json(await fetch(`${baseUrl}/venues?date=2026-10-19`));
    assert.equal(venues.status, 200);
    assert.equal(venues.body.meta.total_count, 12);
    assert.equal(venues.body.meta.floor_counts.floor_4, 4);

    const requests = await json(await fetch(`${baseUrl}/admin/booking-requests`, { headers: adminHeaders }));
    assert.equal(requests.body.meta.total_count, 6);
    assert.deepEqual(requests.body.meta.decision_counts, { pending: 2, approved: 2, rejected: 2 });
  });
});

test('council endpoints enforce missing, invalid, and non-COUNCIL sessions', async () => {
  await withApi(async (baseUrl) => {
    assert.equal((await json(await fetch(`${baseUrl}/council/session`))).status, 401);
    assert.equal((await json(await fetch(`${baseUrl}/council/session`, { headers: adminHeaders }))).status, 403);
    const invalid = await json(await fetch(`${baseUrl}/council/venues`, { headers: { 'x-ironclad-test-session': 'unknown' } }));
    assert.equal(invalid.status, 401);
  });
});

test('council session returns profile and the overridable demo clock', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await councilGet(`${baseUrl}/council/session`));
    assert.equal(result.body.data.full_name, 'Ashley Gabrielle C. Alcantara');
    assert.equal(result.body.data.program_section, 'BSCS 3A');
    assert.equal(result.body.data.role, 'COUNCIL');
    assert.equal(result.body.data.server_time, '2026-10-19T06:15:00.000Z');
    assert.match(result.body.data.display_time, /02:15:00 PM/);
    assert.match(result.body.data.display_date, /Oct 19, 2026/);
  });
});

test('council venue list returns all 16, floor counts, search, and stateless selection', async () => {
  await withApi(async (baseUrl) => {
    const all = await json(await councilGet(`${baseUrl}/council/venues`));
    assert.equal(all.body.meta.total_count, 16);
    assert.deepEqual(all.body.meta.floor_counts, { all_venues: 16, floor_1: 4, floor_2: 4, floor_3: 4, floor_4: 4 });

    const selected = await json(await councilGet(`${baseUrl}/council/venues?floor=3&q=GPU&selected_room_code=Room%20302`));
    assert.equal(selected.body.data.length, 1);
    assert.equal(selected.body.data[0].room_code, 'Room 302');
    assert.equal(selected.body.data[0].is_selected, true);

    const nextRequest = await json(await councilGet(`${baseUrl}/council/venues?floor=3&q=GPU`));
    assert.equal(nextRequest.body.data[0].is_selected, false);
  });
});

test('council status and utilization labels use current entries and configured thresholds', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await councilGet(`${baseUrl}/council/venues?date=2026-10-19`));
    const byCode = Object.fromEntries(result.body.data.map((venue) => [venue.room_code, venue]));
    assert.equal(byCode['Room 101'].status, 'in_session');
    assert.equal(byCode['Room 101'].status_label, 'In Session');
    assert.equal(byCode['Room 101'].utilization_label, 'In Session');
    assert.equal(byCode['Room 201'].utilization_label, 'Allocated');
    assert.equal(byCode['Room 301'].utilization_label, 'Vacant');
    assert.equal(byCode['Room 401'].utilization_label, 'Empty');
    assert.equal(byCode['Room 203'].status, 'unavailable');
    assert.equal(byCode['Room 203'].status_label, 'Locked by Dean');
    assert.equal(byCode['Room 203'].utilization_label, 'Exam Prep');

    const reserved = await json(await councilGet(`${baseUrl}/council/venues?date=2026-10-20&selected_room_code=Room%20201`));
    const room201 = reserved.body.data.find((venue) => venue.room_code === 'Room 201');
    assert.equal(room201.status, 'in_session');
  });
});

test('venue sidebar combines live schedule, vacancy, and pending venue requests', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await councilGet(`${baseUrl}/council/venues/Room%20201/sidebar?date=2026-10-19&at_time=14:15`));
    assert.equal(result.status, 200);
    assert.equal(result.body.data.venue.name, 'Computer Science Lab 1');
    assert.equal(result.body.data.current_session.title, 'CC 116 Advanced Web Systems - BSCS 3A');
    assert.equal(result.body.data.current_session.instructor_name, 'Prof. M. Raby');
    assert.deepEqual(result.body.data.upcoming_schedule.map((item) => item.state_label), ['Free Window', 'Class', 'Reserved']);
    assert.equal(result.body.data.full_vacancy_hours, 1.5);
    assert.equal(result.body.data.pending_requests_for_venue[0].reservation_id, 'RES-DEMO-0001');

    const floorFour = await json(await councilGet(`${baseUrl}/council/venues/Room%20401/sidebar`));
    assert.equal(floorFour.status, 422);
  });
});

test('council booking requests filter, paginate, count, and echo selection', async () => {
  await withApi(async (baseUrl) => {
    const all = await json(await councilGet(`${baseUrl}/council/booking-requests`));
    assert.equal(all.body.meta.total_count, 6);
    assert.deepEqual(all.body.meta.decision_counts, { pending: 2, approved: 2, rejected: 2 });

    const filtered = await json(await councilGet(`${baseUrl}/council/booking-requests?q=Bianca&decision=approved&selected_reservation_id=RES-DEMO-0005&limit=1`));
    assert.equal(filtered.body.meta.total_count, 1);
    assert.equal(filtered.body.data[0].reservation_id, 'RES-DEMO-0005');
    assert.equal(filtered.body.data[0].is_selected, true);

    const room = await json(await councilGet(`${baseUrl}/council/booking-requests?room_code=Room%20104`));
    assert.equal(room.body.data[0].reservation_id, 'RES-DEMO-0004');
  });
});

test('booking request sidebar returns request, venue sidebar, and live conflict result', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await councilGet(`${baseUrl}/council/booking-requests/RES-DEMO-0001/sidebar?at_time=15:30`));
    assert.equal(result.body.data.request.is_selected, true);
    assert.equal(result.body.data.request.requester.student_id, '2022-10892');
    assert.equal(result.body.data.venue_sidebar.venue.room_code, 'Room 201');
    assert.match(result.body.data.venue_sidebar.current_session.status_label, /Reserved/);
    assert.equal(result.body.data.conflict_check, true);
    assert.equal(result.body.data.endorsement, null);
    assert.equal((await json(await councilGet(`${baseUrl}/council/booking-requests/UNKNOWN/sidebar`))).status, 404);
  });
});

test('active notice and guidelines endpoints expose seeded read-only content', async () => {
  await withApi(async (baseUrl) => {
    const notices = await json(await councilGet(`${baseUrl}/council/notices`));
    assert.equal(notices.body.data.length, 1);
    assert.equal(notices.body.data[0].title, 'CSD Fair Badminton Tryout');
    assert.equal(notices.body.data[0].guidelines_available, true);
    const guidelines = await json(await councilGet(`${baseUrl}/council/notices/NOTICE-001/guidelines`));
    assert.match(guidelines.body.data.guidelines, /Available Now/);
    assert.equal((await json(await councilGet(`${baseUrl}/council/notices/UNKNOWN/guidelines`))).status, 404);
  });
});

test('council can configure and create a pending reservation shared with student and admin views', async () => {
  await withApi(async (baseUrl) => {
    const config = await json(await councilGet(`${baseUrl}/council/reservations/config`));
    assert.equal(config.body.data.requester.student_id, '2022-10892');
    const created = await json(await councilPost(`${baseUrl}/council/reservations`, {
      room_code: 'Room 101', date: '2026-10-19', start_time: '11:00', end_time: '12:00', purpose: 'Council documentation filming',
    }));
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, 'pending_approval');
    assert.equal(created.body.data.requested_by, '2022-10892');

    const studentVenue = await json(await fetch(`${baseUrl}/venues/Room%20101?date=2026-10-19`));
    assert.equal(studentVenue.body.data.utilization_percent, 77);
    const adminRequests = await json(await fetch(`${baseUrl}/admin/booking-requests?q=Council%20documentation`, { headers: adminHeaders }));
    assert.equal(adminRequests.body.meta.total_count, 1);

    const conflict = await json(await councilPost(`${baseUrl}/council/reservations`, {
      room_code: 'Room 101', date: '2026-10-19', start_time: '11:30', end_time: '12:30', purpose: 'Overlapping request',
    }));
    assert.equal(conflict.status, 409);
  });
});

test('council creates one endorsement letter without changing the decision', async () => {
  await withApi(async (baseUrl, repository) => {
    const endorsed = await json(await councilPost(`${baseUrl}/council/booking-requests/RES-DEMO-0001/endorsements`, {
      message: 'The council endorses this request for departmental activity.',
    }));
    assert.equal(endorsed.status, 201);
    assert.equal(endorsed.body.data.reservation_id, 'RES-DEMO-0001');
    assert.equal(endorsed.body.data.endorsed_by.full_name, 'Ashley Gabrielle C. Alcantara');
    assert.equal(repository.findReservation('RES-DEMO-0001').decision, 'pending');

    const sidebar = await json(await councilGet(`${baseUrl}/council/booking-requests/RES-DEMO-0001/sidebar`));
    assert.equal(sidebar.body.data.endorsement.endorsement_id, endorsed.body.data.endorsement_id);
    const duplicate = await json(await councilPost(`${baseUrl}/council/booking-requests/RES-DEMO-0001/endorsements`, { message: 'Second letter' }));
    assert.equal(duplicate.status, 409);
  });
});

test('council has no approval or rejection write endpoints', async () => {
  await withApi(async (baseUrl) => {
    const approve = await json(await councilPost(`${baseUrl}/council/booking-requests/RES-DEMO-0001/approve`, {}));
    const reject = await json(await councilPost(`${baseUrl}/council/booking-requests/RES-DEMO-0001/reject`, {}));
    assert.equal(approve.status, 404);
    assert.equal(reject.status, 404);
  });
});

test('admin approval and rejection are immediately reflected in council endpoints', async () => {
  await withApi(async (baseUrl) => {
    const approve = await json(await fetch(`${baseUrl}/admin/booking-requests/RES-DEMO-0001/approve`, { method: 'POST', headers: adminHeaders }));
    assert.equal(approve.status, 200);
    const approvedSidebar = await json(await councilGet(`${baseUrl}/council/booking-requests/RES-DEMO-0001/sidebar?at_time=15:30`));
    assert.equal(approvedSidebar.body.data.request.decision, 'approved');
    assert.match(approvedSidebar.body.data.venue_sidebar.current_session.status_label, /Locked/);

    const reject = await json(await fetch(`${baseUrl}/admin/booking-requests/RES-DEMO-0004/reject`, { method: 'POST', headers: adminHeaders }));
    assert.equal(reject.status, 200);
    const rejected = await json(await councilGet(`${baseUrl}/council/booking-requests?room_code=Room%20104`));
    assert.equal(rejected.body.data[0].decision, 'rejected');
    const studentVenue = await json(await fetch(`${baseUrl}/venues/Room%20104?date=2026-10-23`));
    assert.equal(studentVenue.body.data.utilization_percent, 41);
  });
});

test('browser clients can call the booking API from an allowed frontend origin', async () => {
  await withApi(async (baseUrl) => {
    const preflight = await fetch(`${baseUrl}/reservations/lock`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
    assert.match(preflight.headers.get('access-control-allow-headers'), /Content-Type/i);
  });
});
