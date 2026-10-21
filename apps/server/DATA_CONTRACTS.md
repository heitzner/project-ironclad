# IronClad data contracts

The in-memory repository is the temporary source of truth. IDs are opaque strings. Date-only values use `YYYY-MM-DD`; timestamps use ISO 8601; booking `start` and `end` are integer minutes after midnight in Asia/Manila.

## Authentication

`POST /api/auth/sign-in`

```json
{ "studentId": "20241200-C", "password": "Student@123", "remember": false }
```

Returns `{ token, user, capabilities }`. The HS256 JWT contains only `sub`, `jti`, `iat`, and `exp`; current role and position are resolved from the repository on every request so access changes immediately.

Verification uses `POST /api/auth/verifications` with `{ email, purpose }`, then `POST /api/auth/verifications/confirm` with `{ challengeId, code, email, purpose }`. Purposes are `signup`, `email-change`, and `password-change`. Confirmation returns `{ verified: true, receipt }`.

## Repository entities

- Account: `{ id, studentId, passwordHash, name, role, position, course, yearLevel, section, email, emailVerified, status, disabled, createdAt }`.
- Membership: keyed by account ID, `{ role, position, scope, course }`. This is the authoritative authorization grant.
- Profile: keyed by account ID, `{ version, displayName, avatarUrl, email, emailVerified, updatedAt, corrections[] }`.
- Room: `{ id, floor, name, capacity, location, equipment[], blocked }`; `blocked` is null or `{ label, reason }`.
- Schedule entry: `{ roomId, date, start, end, type, title, host }`.
- Booking: `{ id, roomId, date, shift, start, end, purpose, requesterId, requesterName, studentId, status, createdAt, reviewedBy?, reviewedAt?, reason? }`.
- Closure: `{ id, roomId, startDate, endDate, start, end, reason, mode, createdBy, createdAt }`.
- Post: `{ id, kind, title, description, startsAt, endsAt, venue, organizer, capacity?, status, createdBy?, createdAt, registrationKind?, teamSize?, categories?, program?, questions? }`.
- Registration/application: `{ id, postId, title, kind, userId, name, studentId, program, details, status, createdAt, reviewedBy?, reviewedAt?, reason? }`.
- Handover: `{ id, from, to, scope, role, status, at, respondedAt? }`.
- Archive record: `{ id, title, courseSection, category, organizer, concludedDate, academicYear, semester, venue, permitNo, startTime, endTime, hasAsset }`.

## Shared frontend state

`GET /api/portal/state` returns:

```json
{
  "version": 1,
  "revision": 0,
  "datasetLabel": "Demo week",
  "rooms": [],
  "scheduleWindows": [],
  "scheduleEntries": [],
  "dateOptions": [],
  "posts": [],
  "bookings": [],
  "applications": [],
  "registrations": [],
  "profiles": {},
  "members": {},
  "handovers": [],
  "organizationLog": [],
  "closures": [],
  "archive": [],
  "directory": [],
  "session": { "user": null, "capabilities": {} }
}
```

Private collections are scoped to the caller. Students receive their own activity; Council receives its program applications; Admin receives all booking/application records. Every portal mutation returns `{ data, state }`, where `state` is a freshly scoped snapshot after the transaction.

## Workflow mutations

- `POST /api/portal/bookings`: room/date/shift/start/end/purpose. Student/Council returns pending; Admin returns approved.
- `POST /api/portal/bookings/:id/decision`: `{ status: "approved|declined", reason? }`.
- `POST /api/portal/closures`: `{ roomId, mode, date?, start?, end?, reason }`.
- `DELETE /api/portal/rooms/:id/closures`.
- `POST /api/portal/posts`: announcement, event, or council post fields.
- `POST /api/portal/posts/:id/submissions`: `{ contact, category?, teamName?, members?, answers? }`.
- `POST /api/portal/applications/:id/decision`: `{ status: "accepted|declined", reason? }`. Acceptance updates Membership atomically.
- `PATCH /api/portal/profiles/:id`: display profile fields or `{ correction }`.
- `PATCH /api/portal/members/:id/position`: `{ position }`.
- `POST /api/portal/handovers`: `{ memberId }`.
- `POST /api/portal/handovers/:id/respond`: `{ action: "accept|decline|cancel" }`.

Validation errors use `{ "error": { "code", "message", "details" } }` with status 400/401/403/404/409/422 as applicable.

## Reporting

- `GET /api/dashboard` returns server-computed Admin counts.
- `GET /api/archive` returns filtered archive records and filter metadata.
- `GET /api/archive/export?format=pdf|csv` and `GET /api/archive/:id/export?format=pdf|csv` return downloadable files.
