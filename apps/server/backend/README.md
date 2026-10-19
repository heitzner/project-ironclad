# IronClad room-booking backend

Express backend for the student, administrator, and council room-booking workflows. The implementation is intentionally in-memory: it has no PostgreSQL client, ORM, migrations, or database connection. Restarting the process restores the seeded demo-week data.

## Run and test

Requires Node.js 20 or newer.

```powershell
npm install
npm start
```

The server listens on `http://localhost:3000` by default. Copy `.env.example` values into the process environment when overrides are needed.

Browser clients listed in `CORS_ALLOWED_ORIGINS` may call the API directly. The default permits Vite on `localhost:5173` and `127.0.0.1:5173`. The frontend reads its API base URL from `VITE_API_URL`; production deployments may leave it empty when the API is served from the same origin.

```powershell
npm test
```

## Time configuration

- Morning: `07:00`–`12:00`
- Evening: `13:00`–`18:00`
- All day: the combined morning and evening windows
- Operational timetable: `07:00`–`21:30`
- Utilization is **booked time**, rounded to the nearest whole percent.

All ranges are configuration values in `.env.example`.

## Student/shared booking API

- `GET /venues?date=YYYY-MM-DD&period=all_day|morning|evening&floor=1|2|3|4&q=text`
- `GET /venues/:roomCode?date=YYYY-MM-DD&period=all_day|morning|evening`
- `GET /venues/:roomCode/occupancy?date=YYYY-MM-DD&at_time=HH:mm`
- `GET /venues/:roomCode/vacancy?date=YYYY-MM-DD&start_time=HH:mm&end_time=HH:mm`
- `GET /dates/options`
- `GET /reservations/config?room_code=Room%20101&date=YYYY-MM-DD`
- `POST /reservations/lock`

Example reservation body:

```json
{
  "room_code": "Room 101",
  "date": "2026-10-20",
  "start_time": "10:00",
  "end_time": "11:00",
  "purpose": "Council planning session",
  "student_id": "2022-10892"
}
```

New reservations are pending until an administrator decides them. Floor 4 is visible but its details are unavailable and it cannot be reserved. Room 203 remains unavailable because it is locked by the dean.

## Administrator API

Send `x-ironclad-test-session: admin-demo` with every admin request.

- `GET /admin/session`
- `GET /admin/room-bookings/venues`
- `GET /admin/booking-requests`
- `GET /admin/booking-requests/:reservationId`
- `POST /admin/booking-requests/:reservationId/approve`
- `POST /admin/booking-requests/:reservationId/reject`

The legacy decision aliases `/reservations/:reservationId/approve` and `/reservations/:reservationId/reject` use the same administrator check.

## Council API

Send `x-ironclad-test-session: council-demo` with every council request.

- `GET /council/session`
- `GET /council/venues`
- `GET /council/venues/:roomCode/sidebar`
- `GET /council/booking-requests`
- `GET /council/booking-requests/:reservationId/sidebar`
- `GET /council/notices`
- `GET /council/notices/:noticeId/guidelines`
- `GET /council/reservations/config`
- `POST /council/reservations`
- `POST /council/booking-requests/:reservationId/endorsements`

Council users can configure and create pending reservations and can attach one endorsement letter to a reservation. They cannot approve or reject requests; no council decision endpoints are registered.

Example endorsement body:

```json
{
  "message": "The council endorses this reservation request."
}
```

## Errors

Validation and domain failures use JSON responses with an `error.code` and `error.message`. The implemented status codes are:

- `400` malformed JSON or invalid query values
- `401` missing test session
- `403` wrong role or disconnected role service
- `404` missing route, venue, reservation, notice, or student
- `409` overlapping reservation, duplicate decision, or duplicate endorsement
- `422` unavailable venue or invalid reservation semantics

The in-memory repository is isolated behind `InMemoryBookingRepository`, so a database manager can replace it later without adding database dependencies now.
