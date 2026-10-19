import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { createDemoData } from '../src/data/demoData.js';
import { InMemoryBookingRepository } from '../src/repositories/inMemoryBookingRepository.js';

const settings = Object.freeze({
  timeZone: 'Asia/Manila',
  approverRole: 'MIS Administrator',
  purposeMaxLength: 200,
  minSlotMinutes: 30,
  defaultStudentId: '2022-10892',
  demoWeekStart: '2026-10-19',
  calendar: Object.freeze({ term_label: 'Term 2', week_label: 'W6' }),
  operationalWindow: Object.freeze({ start: '07:00', end: '21:30' }),
  admin: Object.freeze({
    connectionState: 'connected',
    sessionHeader: 'x-ironclad-test-session',
    testSessionId: 'admin-demo',
    nonAdminSessionId: 'student-demo',
    requestLimit: 20,
    requestLimitMax: 100,
    decisionReasonMaxLength: 500,
  }),
  periods: Object.freeze({
    morning: Object.freeze([{ start: '07:00', end: '12:00' }]),
    evening: Object.freeze([{ start: '13:00', end: '18:00' }]),
    all_day: Object.freeze([
      { start: '07:00', end: '12:00' },
      { start: '13:00', end: '18:00' },
    ]),
  }),
});

async function withApi(run) {
  const repository = new InMemoryBookingRepository(createDemoData(settings.demoWeekStart));
  const server = createApp({ repository, settings }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
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

function lockRequest(baseUrl, overrides = {}) {
  return fetch(`${baseUrl}/reservations/lock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      room_code: 'Room 101',
      date: '2026-10-19',
      start_time: '11:00',
      end_time: '12:00',
      purpose: 'Ethics with Peace Studies Filming',
      student_id: '2022-10892',
      ...overrides,
    }),
  });
}

test('GET /venues defaults All Venues to 12 usable rooms and exposes Floor 4 counts', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await fetch(
      `${baseUrl}/venues?date=2026-10-19&period=all_day`,
    ));
    assert.equal(result.status, 200);
    assert.equal(result.body.meta.total_count, 12);
    assert.deepEqual(result.body.meta.floor_counts, {
      all_venues: 12,
      floor_1: 4,
      floor_2: 4,
      floor_3: 4,
      floor_4: 4,
    });
    assert.equal(result.body.meta.floor_unavailable_notice, true);
    assert.ok(result.body.data.every((venue) => venue.floor <= 3));

    const floorFour = await json(await fetch(
      `${baseUrl}/venues?date=2026-10-19&floor=4`,
    ));
    assert.equal(floorFour.body.meta.total_count, 4);
    assert.ok(floorFour.body.data.every(
      (venue) => venue.status === 'unavailable' && !venue.is_details_available,
    ));
  });
});

test('venue filtering searches equipment case-insensitively and keeps filtered counts', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await fetch(
      `${baseUrl}/venues?date=2026-10-19&period=all_day&floor=3&q=GPU`,
    ));
    assert.equal(result.body.meta.total_count, 1);
    assert.equal(result.body.data[0].room_code, 'Room 302');
    assert.deepEqual(result.body.meta.floor_counts, {
      all_venues: 1,
      floor_1: 0,
      floor_2: 0,
      floor_3: 1,
      floor_4: 0,
    });
  });
});

test('utilization is booked minutes divided by selected period minutes', async () => {
  await withApi(async (baseUrl) => {
    const room101 = await json(await fetch(
      `${baseUrl}/venues/Room%20101?date=2026-10-19&period=all_day`,
    ));
    const morning101 = await json(await fetch(
      `${baseUrl}/venues/Room%20101?date=2026-10-19&period=morning`,
    ));
    const room102 = await json(await fetch(
      `${baseUrl}/venues/Room%20102?date=2026-10-19&period=all_day`,
    ));
    assert.equal(room101.body.data.utilization_percent, 67);
    assert.equal(morning101.body.data.utilization_percent, 80);
    assert.equal(room102.body.data.utilization_percent, 41);
  });
});

test('status derivation and summary counts use the same active filters', async () => {
  await withApi(async (baseUrl) => {
    const all = await json(await fetch(`${baseUrl}/venues?date=2026-10-19`));
    assert.deepEqual(all.body.meta.summary, {
      available: 11,
      occupied: 0,
      unavailable: 1,
    });
    const room203 = all.body.data.find((venue) => venue.room_code === 'Room 203');
    assert.equal(room203.status, 'unavailable');
    assert.equal(room203.status_label, 'Locked by Dean');
    assert.equal(room203.utilization_percent, 0);

    const lockedSearch = await json(await fetch(
      `${baseUrl}/venues?date=2026-10-19&q=network%20systems`,
    ));
    assert.deepEqual(lockedSearch.body.meta.summary, {
      available: 0,
      occupied: 0,
      unavailable: 1,
    });
  });
});

test('venue details return the period timetable and unknown venues return 404', async () => {
  await withApi(async (baseUrl) => {
    const details = await json(await fetch(
      `${baseUrl}/venues/Room%20101?date=2026-10-19&period=morning`,
    ));
    assert.deepEqual(details.body.data.timetable, [
      { start_time: '07:00', end_time: '11:00', state: 'occupied' },
      { start_time: '11:00', end_time: '12:00', state: 'free_window' },
    ]);
    assert.equal((await json(await fetch(
      `${baseUrl}/venues/Room%20999?date=2026-10-19`,
    ))).status, 404);
  });
});

test('occupancy derives the current Room 201 session and ordered upcoming schedule', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await fetch(
      `${baseUrl}/venues/Room%20201/occupancy?date=2026-10-19&at_time=14:15`,
    ));
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data.venue, {
      room_code: 'Room 201',
      name: 'Computer Science Lab 1',
    });
    assert.equal(
      result.body.data.current_session.title,
      'CC 116 Advanced Web Systems - BSCS 3A',
    );
    assert.equal(result.body.data.current_session.instructor_name, 'Prof. M. Raby');
    assert.equal(result.body.data.current_session.status_label, 'In Session • Until 03:00 PM');
    assert.deepEqual(
      result.body.data.upcoming_schedule.map((entry) => entry.state_label),
      ['Free Window', 'Class', 'Reserved'],
    );
    assert.equal(result.body.data.term_label, 'Term 2');
    assert.equal(result.body.data.week_label, 'W6');
  });
});

test('occupancy rejects unavailable venues', async () => {
  await withApi(async (baseUrl) => {
    assert.equal((await json(await fetch(
      `${baseUrl}/venues/Room%20203/occupancy?date=2026-10-19&at_time=14:15`,
    ))).status, 422);
    assert.equal((await json(await fetch(
      `${baseUrl}/venues/Room%20401/occupancy?date=2026-10-19&at_time=14:15`,
    ))).status, 422);
  });
});

test('vacancy computes free windows, total hours, and requested-start suggestion', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await fetch(
      `${baseUrl}/venues/Room%20201/vacancy?date=2026-10-19&requested_start=15:30`,
    ));
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data.free_windows, [
      { start_time: '15:00', end_time: '16:30', duration_hours: 1.5 },
    ]);
    assert.equal(result.body.data.full_vacancy_hours, 1.5);
    assert.deepEqual(result.body.data.suggested_duration, {
      start_time: '15:30',
      end_time: '16:30',
      duration_hours: 1,
    });
  });
});

test('reservation config returns the placeholder student and approval rules', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await fetch(
      `${baseUrl}/reservations/config?student_id=2022-10892`,
    ));
    assert.equal(result.status, 200);
    assert.equal(result.body.data.requester.full_name, 'Ashley Gabrielle C. Alcantara');
    assert.equal(result.body.data.requester.program_section, 'BSCS 3A');
    assert.match(result.body.data.approval_notice, /MIS Administrator/);
    assert.equal(result.body.data.purpose_max_length, 200);
    assert.equal(result.body.data.minimum_slot_minutes, 30);
  });
});

test('a lock request creates a pending hold that affects utilization and conflicts', async () => {
  await withApi(async (baseUrl) => {
    const created = await json(await lockRequest(baseUrl));
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, 'pending_approval');
    assert.equal(created.body.data.approver_role, 'MIS Administrator');
    assert.equal(created.body.data.duration_hours, 1);
    assert.equal(created.body.data.purpose, 'Ethics with Peace Studies Filming');

    const details = await json(await fetch(
      `${baseUrl}/venues/Room%20101?date=2026-10-19&period=all_day`,
    ));
    assert.equal(details.body.data.utilization_percent, 77);

    const conflict = await json(await lockRequest(baseUrl, {
      start_time: '11:30',
      end_time: '12:30',
    }));
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.code, 'SLOT_CONFLICT');
  });
});

test('pending holds update venue status and filtered summary counts', async () => {
  await withApi(async (baseUrl) => {
    const morningHold = await json(await lockRequest(baseUrl, {
      room_code: 'Room 204',
      start_time: '07:00',
      end_time: '12:00',
      purpose: 'Morning organization program',
    }));
    const eveningHold = await json(await lockRequest(baseUrl, {
      room_code: 'Room 204',
      start_time: '15:00',
      end_time: '18:00',
      purpose: 'Evening organization program',
    }));
    assert.equal(morningHold.status, 201);
    assert.equal(eveningHold.status, 201);

    const floorTwo = await json(await fetch(
      `${baseUrl}/venues?date=2026-10-19&period=all_day&floor=2`,
    ));
    const room204 = floorTwo.body.data.find((venue) => venue.room_code === 'Room 204');
    assert.equal(room204.utilization_percent, 100);
    assert.equal(room204.status, 'occupied');
    assert.deepEqual(floorTwo.body.meta.summary, {
      available: 2,
      occupied: 1,
      unavailable: 1,
    });
  });
});

test('lock validation rejects overlaps, unavailable rooms, bad increments, and non-free ranges', async () => {
  await withApi(async (baseUrl) => {
    assert.equal((await json(await lockRequest(baseUrl, {
      start_time: '10:30',
      end_time: '11:30',
    }))).status, 409);
    assert.equal((await json(await lockRequest(baseUrl, {
      room_code: 'Room 203',
    }))).status, 422);
    assert.equal((await json(await lockRequest(baseUrl, {
      room_code: 'Room 401',
    }))).status, 422);

    const increment = await json(await lockRequest(baseUrl, {
      start_time: '11:15',
      end_time: '11:45',
    }));
    assert.equal(increment.status, 400);
    assert.equal(increment.body.error.code, 'INVALID_SLOT_INCREMENT');

    const outside = await json(await lockRequest(baseUrl, {
      start_time: '06:30',
      end_time: '07:00',
    }));
    assert.equal(outside.status, 422);
    assert.equal(outside.body.error.code, 'NOT_WITHIN_FREE_WINDOW');

    const emptyPurpose = await json(await lockRequest(baseUrl, { purpose: '   ' }));
    assert.equal(emptyPurpose.status, 400);
  });
});

test('approve converts a pending hold to a locked occupancy slot', async () => {
  await withApi(async (baseUrl) => {
    const created = await json(await lockRequest(baseUrl));
    const reservationId = created.body.data.reservation_id;
    const approved = await json(await fetch(
      `${baseUrl}/reservations/${reservationId}/approve`,
      { method: 'POST', headers: { 'x-ironclad-test-session': 'admin-demo' } },
    ));
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.status, 'approved');

    const occupancy = await json(await fetch(
      `${baseUrl}/venues/Room%20101/occupancy?date=2026-10-19&at_time=11:30`,
    ));
    assert.equal(occupancy.body.data.current_session.entry_type, 'reserved');
    assert.equal(occupancy.body.data.current_session.status_label, 'Locked • Until 12:00 PM');

    const repeated = await json(await fetch(
      `${baseUrl}/reservations/${reservationId}/approve`,
      { method: 'POST', headers: { 'x-ironclad-test-session': 'admin-demo' } },
    ));
    assert.equal(repeated.status, 409);
  });
});

test('reservation durations are rounded to one decimal place', async () => {
  await withApi(async (baseUrl) => {
    const created = await json(await lockRequest(baseUrl, {
      room_code: 'Room 201',
      start_time: '15:00',
      end_time: '16:30',
    }));
    assert.equal(created.status, 201);
    assert.equal(created.body.data.duration_hours, 1.5);
  });
});

test('reject releases a pending hold and transitions are validated', async () => {
  await withApi(async (baseUrl) => {
    const created = await json(await lockRequest(baseUrl));
    const reservationId = created.body.data.reservation_id;
    const rejected = await json(await fetch(
      `${baseUrl}/reservations/${reservationId}/reject`,
      { method: 'POST', headers: { 'x-ironclad-test-session': 'admin-demo' } },
    ));
    assert.equal(rejected.body.data.status, 'rejected');

    const retry = await json(await lockRequest(baseUrl));
    assert.equal(retry.status, 201);
    assert.equal((await json(await fetch(
      `${baseUrl}/reservations/RES-9999/reject`,
      { method: 'POST', headers: { 'x-ironclad-test-session': 'admin-demo' } },
    ))).status, 404);
  });
});

test('date options contain the seven resettable Demo week dates', async () => {
  await withApi(async (baseUrl) => {
    const result = await json(await fetch(`${baseUrl}/dates/options`));
    assert.deepEqual(
      result.body.data.map((option) => option.date),
      ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'],
    );
    assert.ok(result.body.data.every((option) => option.dataset_label === 'Demo week'));
  });
});
