# Legacy Room & Laboratory Booking API

> The active integrated API lives in `apps/server/src`. Running `npm start` or
> `npm run dev` from this legacy directory intentionally starts that active API,
> so older terminal setups cannot occupy port 3000 with incompatible routes.
> The implementation below remains for compatibility tests.

Express implementation for the IronClad portal and booking catalog.
It has no database, ORM, cache, file persistence, or external timetable source. Venues, schedules,
students, and reservations are held in process memory and reset to Demo week data whenever the
server restarts.

## Run

```powershell
npm install
npm test
npm run dev
npm start
```

Configuration defaults are documented in `.env.example`. Demo week begins on the current week's
Monday unless `DEMO_WEEK_START` is supplied.

## Endpoints

The default React application uses the role-aware `/auth/*` and `/portal/*` routes documented in
[`API_CONTRACTS.md`](./API_CONTRACTS.md). The routes listed below remain available for the dedicated
booking, news-feed, and administrator feature adapters.

- `GET /health`
- `GET /news-feed?q=&category=&limit=&offset=`
- `GET /news-feed/:postId`
- `GET /booking/notices`
- `GET /venues?date=YYYY-MM-DD&period=all_day|morning|evening&floor=1|2|3|4&q=text`
- `GET /venues/:roomCode?date=YYYY-MM-DD&period=all_day|morning|evening`
- `GET /venues/:roomCode/occupancy?date=YYYY-MM-DD&at_time=HH:mm`
- `GET /venues/:roomCode/vacancy?date=YYYY-MM-DD&requested_start=HH:mm`
- `GET /dates/options`
- `GET /reservations/config?student_id=2022-10892`
- `POST /reservations/lock`
- `POST /reservations/:reservationId/approve`
- `POST /reservations/:reservationId/reject`

### Student News Feed

News-feed posts, categories, search, and pagination are served from the same Express application as
booking and administration. All seeded posts are marked with `is_demo: true` and
`dataset_label: "Demo week"`. The repository is in memory until database integration is supplied.

### Admin Room Bookings

Admin requests use the configured `x-ironclad-test-session` header. The seeded ADMIN session value
is `admin-demo`; missing or unknown sessions return 401, while the recognized `student-demo`
non-admin session returns 403.

- `GET /admin/session`
- `GET /admin/room-bookings/venues?q=&occupancy=all&date=YYYY-MM-DD&period=all_day`
- `GET /admin/booking-requests?q=&decision=all&occupancy=all&room_code=&sort=created_at&limit=20&offset=0`
- `GET /admin/booking-requests/:reservationId`
- `POST /admin/booking-requests/:reservationId/approve`
- `POST /admin/booking-requests/:reservationId/reject`
- `GET /admin/events`
- `POST /admin/events`
- `PUT /admin/events/:eventId`
- `POST /admin/events/:eventId/complete`
- `GET /admin/members`
- `GET /admin/council-roles`
- `PATCH /admin/members/:memberId/council-role`

Approval and rejection bodies accept an optional `reason`. Decisions are final and append an
entry to the shared in-memory decision log. The six seeded requests cover pending, approved, and
rejected states. The admin lists default to `connection_state: connected`; setting
`ADMIN_CONNECTION_STATE=not_connected` returns empty lists with no sample totals.

Campus events and council-role assignments use the same authenticated in-memory repository. Event
and member mutations include a numeric `version`; stale writes return `409 VERSION_CONFLICT`.
Event venues are validated and overlapping active events in the same venue return `409`.
The local Vite origin is allowed by `CORS_ALLOWED_ORIGINS` so browser reads and writes can include
the configured admin test-session header.

### Council Room Bookings

Council requests use the same configurable test-session header with the seeded value
`council-demo`. Council members can browse live venue/request information, create reservation
requests, and write one endorsement per request. They cannot approve or reject reservations.

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

The lock body contains `room_code`, `date`, `start_time`, `end_time`, `purpose`, and `student_id`.
It creates a `pending_approval` hold rather than an immediate lock. Pending holds block overlapping
requests and participate in utilization and status calculations. Approval changes a hold to a
locked schedule entry; rejection releases it. The legacy non-admin-prefixed approval paths remain
as compatibility aliases but require the same ADMIN test session and use the same decision log.

Times use 24-hour `HH:mm` format. User-selected reservation times use 30-minute increments.
Morning is 07:00-12:00 and evening is 13:00-18:00. All-day combines those periods and excludes
the 12:00-13:00 gap for utilization. Vacancy suggestions use the configurable 07:00-21:30
operational day so the evening schedules shown in the sidebar are represented.

## Venue counts

The seed contains the explicitly requested room ranges 101-104 through 401-404. The unfiltered
All Venues catalog returns the 12 usable rooms on Floors 1-3. Floor 4 is queried explicitly with
`floor=4` and returns rooms 401-404 as unavailable with details disabled. Floor-tab metadata reports
`all_venues: 12` and four rooms for each individual floor.
