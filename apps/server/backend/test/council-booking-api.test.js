import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { createDemoData } from '../src/data/demoData.js';
import { InMemoryBookingRepository } from '../src/repositories/inMemoryBookingRepository.js';

const settings = Object.freeze({
  ...config,
  demoWeekStart: '2026-10-19',
  demoNow: '2026-10-20T14:15:00+08:00',
  council: Object.freeze({
    ...config.council,
    clockIso: '2026-10-20T14:15:00+08:00',
  }),
});

const councilHeaders = Object.freeze({ 'x-ironclad-test-session': 'council-demo' });
const adminHeaders = Object.freeze({ 'x-ironclad-test-session': 'admin-demo' });

async function withApi(run) {
  const repository = new InMemoryBookingRepository(createDemoData(settings.demoWeekStart));
  const server = createApp({ repository, settings }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function json(response) {
  return { status: response.status, body: await response.json() };
}

test('council endpoints require a valid COUNCIL test session', async () => {
  await withApi(async (baseUrl) => {
    const missing = await json(await fetch(`${baseUrl}/council/session`));
    const invalid = await json(await fetch(`${baseUrl}/council/session`, {
      headers: { 'x-ironclad-test-session': 'unknown' },
    }));
    const admin = await json(await fetch(`${baseUrl}/council/session`, {
      headers: adminHeaders,
    }));
    assert.equal(missing.status, 401);
    assert.equal(invalid.status, 401);
    assert.equal(admin.status, 403);
  });
});

test('council session and venue catalog use the configured demo clock', async () => {
  await withApi(async (baseUrl) => {
    const session = await json(await fetch(`${baseUrl}/council/session`, {
      headers: councilHeaders,
    }));
    assert.equal(session.status, 200);
    assert.equal(session.body.data.role, 'COUNCIL');
    assert.equal(session.body.data.server_time, '2026-10-20T06:15:00.000Z');

    const catalog = await json(await fetch(
      `${baseUrl}/council/venues?date=2026-10-20&period=all_day`,
      { headers: councilHeaders },
    ));
    assert.equal(catalog.status, 200);
    assert.equal(catalog.body.meta.total_count, 16);
    assert.equal(catalog.body.meta.floor_counts.floor_4, 4);
    const room203 = catalog.body.data.find((venue) => venue.room_code === 'Room 203');
    assert.equal(room203.status, 'unavailable');
    assert.equal(room203.utilization_label, 'Exam Prep');
  });
});

test('council venue sidebar combines occupancy, vacancy, and pending requests', async () => {
  await withApi(async (baseUrl) => {
    const sidebar = await json(await fetch(
      `${baseUrl}/council/venues/Room%20201/sidebar?date=2026-10-20&at_time=14:15`,
      { headers: councilHeaders },
    ));
    assert.equal(sidebar.status, 200);
    assert.equal(sidebar.body.data.venue.room_code, 'Room 201');
    assert.equal(sidebar.body.data.current_session.title, 'CC 116 Advanced Web Systems - BSCS 3A');
    assert.ok(Array.isArray(sidebar.body.data.free_windows));
    assert.ok(Array.isArray(sidebar.body.data.pending_requests_for_venue));
  });
});

test('council notices expose active content and available guidelines', async () => {
  await withApi(async (baseUrl) => {
    const notices = await json(await fetch(`${baseUrl}/council/notices`, {
      headers: councilHeaders,
    }));
    assert.equal(notices.status, 200);
    assert.equal(notices.body.data[0].notice_id, 'NOTICE-001');
    assert.equal(notices.body.data[0].guidelines_available, true);

    const guidelines = await json(await fetch(
      `${baseUrl}/council/notices/NOTICE-001/guidelines`,
      { headers: councilHeaders },
    ));
    assert.equal(guidelines.status, 200);
    assert.match(guidelines.body.data.guidelines, /Room Bookings/);
  });
});

test('council can request a reservation and create one endorsement without deciding it', async () => {
  await withApi(async (baseUrl) => {
    const reservation = await json(await fetch(`${baseUrl}/council/reservations`, {
      method: 'POST',
      headers: { ...councilHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        room_code: 'Room 101',
        date: '2026-10-20',
        start_time: '11:00',
        end_time: '12:00',
        purpose: 'Council planning session',
      }),
    }));
    assert.equal(reservation.status, 201);
    assert.equal(reservation.body.data.status, 'pending_approval');
    assert.equal(reservation.body.data.requested_by, '2022-10892');
    const reservationId = reservation.body.data.reservation_id;

    const endorsement = await json(await fetch(
      `${baseUrl}/council/booking-requests/${reservationId}/endorsements`,
      {
        method: 'POST',
        headers: { ...councilHeaders, 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Endorsed for MIS administrator review.' }),
      },
    ));
    assert.equal(endorsement.status, 201);
    assert.equal(endorsement.body.data.reservation_id, reservationId);

    const duplicate = await json(await fetch(
      `${baseUrl}/council/booking-requests/${reservationId}/endorsements`,
      {
        method: 'POST',
        headers: { ...councilHeaders, 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Duplicate endorsement.' }),
      },
    ));
    assert.equal(duplicate.status, 409);

    const forbiddenDecision = await json(await fetch(
      `${baseUrl}/council/booking-requests/${reservationId}/approve`,
      { method: 'POST', headers: councilHeaders },
    ));
    assert.equal(forbiddenDecision.status, 404);

    const request = await json(await fetch(
      `${baseUrl}/council/booking-requests/${reservationId}/sidebar?at_time=11:30`,
      { headers: councilHeaders },
    ));
    assert.equal(request.body.data.request.decision, 'pending');
    assert.equal(request.body.data.endorsement.endorsement_id, endorsement.body.data.endorsement_id);

    const approved = await json(await fetch(
      `${baseUrl}/admin/booking-requests/${reservationId}/approve`,
      { method: 'POST', headers: adminHeaders },
    ));
    assert.equal(approved.status, 200);

    const councilRequests = await json(await fetch(
      `${baseUrl}/council/booking-requests?room_code=Room%20101&decision=approved`,
      { headers: councilHeaders },
    ));
    assert.ok(councilRequests.body.data.some(
      (item) => item.reservation_id === reservationId && item.decision === 'approved',
    ));
  });
});
