# IronClad in-memory API contracts

The default React application uses the routes below. All mutable data is owned by
`InMemoryPortalRepository`; controllers depend on `PortalService`, not on storage details. A future
database adapter can implement the repository methods without changing these HTTP contracts or the
frontend. The current process resets to records marked `is_demo: true` and
`dataset_label: "Demo week"` whenever the server restarts.

Authenticated requests use `Authorization: Bearer <token>`.

## Session and account contracts

- `POST /auth/sign-in`
  - Request: `{ "studentId": "20241200-C", "password": "Student@123", "remember": false }`
  - Response: `{ "user": PublicUser, "capabilities": CapabilityMap, "token": "demo-..." }`
- `POST /auth/register`
  - Request: `{ "studentId", "name", "email", "course", "yearLevel", "section", "password", "confirmPassword" }`
  - Response: `{ "confirmed": true, "message": "..." }`
- `GET /auth/session`
  - Response: `{ "user": PublicUser|null, "capabilities": CapabilityMap }`
- `POST /auth/sign-out`
  - Response: `{ "signedOut": true }`
- `POST /auth/password-reset`
  - Request: `{ "email": "student@campus.example.test" }`
  - Response: `{ "confirmed": true, "message": "..." }`
- `POST /auth/verifications`
  - Request: `{ "email", "purpose": "email-change"|"password-change" }`
  - Response: `{ "id": "VER-...", "sent": true, "demo_code": "123456", "expires_in_seconds": 600 }`
- `POST /auth/verifications/confirm`
  - Request: `{ "challengeId", "code", "email", "purpose" }`
  - Response: `{ "verified": true, "receipt": "VRC-..." }`
- `POST /auth/password`
  - Request: `{ "currentPassword", "newPassword", "verificationReceipt" }`
  - Response: `{ "confirmed": true }`

`PublicUser` contains `id`, `studentId`, `name`, `role`, `position`, `course`, `email`, `yearLevel`,
`section`, `status`, and `testAccount`. Passwords are never returned.

## Shared portal state

`GET /portal/state` returns the authoritative snapshot used by the UI:

```json
{
  "version": 1,
  "revision": 0,
  "datasetLabel": "Demo week",
  "rooms": [Room],
  "scheduleWindows": [{ "shift": "morning", "start": 420, "end": 720 }],
  "scheduleEntries": [ScheduleEntry],
  "dateOptions": ["2026-10-19"],
  "posts": [Post],
  "bookings": [Booking],
  "applications": [Application],
  "registrations": [Registration],
  "profiles": { "account-id": Profile },
  "members": { "account-id": Membership },
  "handovers": [Handover],
  "organizationLog": [OrganizationLog],
  "closures": [Closure],
  "archive": [ArchiveRecord],
  "directory": [PublicUser],
  "session": { "user": "PublicUser|null", "capabilities": {} }
}
```

The service filters private collections by role: students receive their own submissions and profile,
council officers receive records for their program, and administrators receive campus-wide records.
Signed-out callers receive public posts, rooms, and schedules but no directory or private activity.

Core mock records use these fields:

- `Room`: `id`, `name`, `capacity`, `floor`, `location`, `equipment[]`, `icon`, `selectedIcon`,
  `blocked|null`, `is_details_available`.
- `ScheduleEntry`: `roomId`, `date`, `start`, `end`, `type`, `title`, `host`, `state`.
- `Booking`: `id`, `roomId`, `requesterId`, `requesterName`, `studentId`, `date`, `start`, `end`,
  `purpose`, `status`, `reason?`, `reviewedBy?`, `reviewedAt?`, `createdAt`.
- `Post`: `id`, `kind`, `title`, `description`, `startsAt`, `endsAt`, `venue`, `organizer`,
  `capacity`, `status`, plus event registration or council application configuration.
- `Application`/`Registration`: `id`, `postId`, `title`, `kind`, `userId`, `name`, `studentId`,
  `program`, `details`, `status`, `createdAt`, and optional review fields.

Times in portal state are integer minute offsets from midnight; timestamps use ISO 8601.

## Portal mutations

Every successful portal mutation returns `{ "data": <changed record>, "state": <fresh PortalState> }`.

- `POST /portal/bookings`: `{ roomId, date, start, end, purpose }`
- `POST /portal/bookings/:bookingId/decision`: `{ status: "approved"|"declined", reason? }`
- `POST /portal/closures`: `{ roomId, mode: "interval"|"day"|"week"|"indefinite", date?, start?, end?, reason }`
- `DELETE /portal/rooms/:roomId/closures`
- `POST /portal/posts`: post fields for `announcement`, `event`, or `council`
- `POST /portal/posts/:postId/submissions`: `{ contact, category?, teamName?, members?, answers? }`
- `POST /portal/applications/:applicationId/decision`: `{ status: "accepted"|"declined", reason? }`
- `PATCH /portal/profiles/:accountId`: `{ id, email, displayName, avatarUrl, emailVerificationReceipt? }`
  or `{ id, correction: { field, value, reason } }`
- `PATCH /portal/members/:memberId/position`: `{ position }`
- `POST /portal/handovers`: `{ memberId }`
- `POST /portal/handovers/:handoverId/respond`: `{ action: "accept"|"decline"|"cancel" }`

## Errors

Errors consistently use:

```json
{ "error": { "code": "CONFLICT", "message": "Human-readable message", "details": {} } }
```

The API uses `400` for malformed JSON/query input, `401` for a missing/invalid session, `403` for a
role or program restriction, `404` for missing records/routes, `409` for schedule or state conflicts,
and `422` for a well-formed request that fails field or business validation.
