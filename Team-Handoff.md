# Project IronClad — Team Workflow Guide

Updated 22 October 2026, Asia/Manila.

The current application is an integrated React/Vite frontend with an Express backend and a process-local in-memory repository. The frontend and backend communicate through REST endpoints. There is no PostgreSQL, Redis, ORM, SQL migration, or live database connection yet.

## Purpose of this guide

This file is the team-facing source of truth for the current user journeys, routes, permissions, runtime commands, and handoff boundaries. Keep it concise and update an existing section when a workflow changes.

Before changing code, also read:

- [.github/CODEOWNERS](.github/CODEOWNERS) for ownership.
- [apps/AGENTS.md](apps/AGENTS.md) for contribution rules under `apps/`.
- [apps/server/DATA_CONTRACTS.md](apps/server/DATA_CONTRACTS.md) for current HTTP and repository payloads.
- [QA-BUG-AND-ISSUE-REPORT.md](QA-BUG-AND-ISSUE-REPORT.md) for known defects and security findings.

Do not add or connect a database until the database owner supplies the architecture. Preserve the repository boundary so the in-memory implementation can later be replaced without rewriting controllers or frontend services.

## Authoritative project structure

```text
project-ironclad/
|-- .github/CODEOWNERS
|-- Team-Handoff.md
|-- QA-BUG-AND-ISSUE-REPORT.md
|-- apps/
|   |-- AGENTS.md
|   |-- server/
|   |   |-- src/                         # Active Express backend
|   |   |   |-- data/                    # Demo-week seed data
|   |   |   |-- http/                    # Access, validation, error handling
|   |   |   |-- repositories/            # In-memory DAL/repository
|   |   |   |-- routes/                  # Auth route modules
|   |   |   |-- security/                # Password and JWT helpers
|   |   |   `-- services/                # Auth, mail, and portal workflows
|   |   |-- test/                        # Active backend tests
|   |   |-- backend/                     # Legacy compatibility implementation
|   |   |-- DATA_CONTRACTS.md
|   |   `-- README.md
|   `-- web/
|       `-- Frontend/                    # Active React/Vite frontend
|           `-- src/
|               |-- components/
|               |-- context/
|               |-- data/
|               |-- features/
|               |-- hooks/
|               |-- pages/
|               `-- services/
`-- packages/
    `-- database/                        # Reserved for the database team
```

`apps/server/src` is the authoritative backend runtime. The standard root scripts and both server package start commands resolve to `apps/server/src/server.js`. Do not add new functionality to `apps/server/backend/src`; that tree contains older contracts and remains only for compatibility/cleanup work.

`apps/web/Frontend` is the authoritative frontend. `apps/web` itself is not the frontend package root.

## Current runtime model

- The backend uses Express, hashed passwords, signed bearer-token sessions, Nodemailer-compatible email verification, and `InMemoryPortalRepository`.
- Runtime records live only in the Node.js process and disappear when the backend restarts.
- The backend seeds 13 local test accounts and demo-week rooms, schedules, posts, and archive records on startup.
- The default frontend composition is `FrontendSystem`. It loads the authenticated session and `/api/portal/state`, sends mutations to the active backend, applies the fresh state returned by each mutation, and refreshes state every 15 seconds.
- The browser stores only the session token in session storage, or local storage when “Remember me” is selected. The active workflow data is not browser-local.
- The frontend reads its API base from `VITE_API_URL`. Local development uses `/backend`; Vite proxies that path to `http://127.0.0.1:3000`.
- A production or tunnel deployment must expose the backend through the configured API URL or provide a same-origin reverse proxy. Vite's development proxy is not a production server.
- No WebSocket synchronization is implemented. State updates use mutation responses and periodic polling.

## Roles and permissions

| Role / position | Current responsibilities and access |
| --- | --- |
| Viewer | Browse and filter the News Feed, open post details, and start login/signup before a protected action. |
| Student | Register for events, apply to their program's council, request rooms, view their own activity, edit their profile, and use Archive. |
| Council | All shared account/booking actions; publish announcements/events/recruitment; view participant records; review applications for their own program. |
| Admin | All shared actions; approve/decline room requests; schedule/reopen room closures; publish and review; view the Admin dashboard. Admin personal bookings auto-approve. |
| President | All organization-management actions, including nominating a successor and appointing/changing Vice President and Secretary. |
| Vice President / Secretary | Access their organization-management page and manage lower positions, but cannot appoint/change Vice President or Secretary and cannot transfer the presidency. |
| Treasurer / Auditor / other members | No organization-management page or position-management API access. They retain the normal capabilities of their base Student, Council, or Admin role. |

The backend is authoritative for authentication, role checks, position checks, organization scope, conflicts, and mutations. Hiding a frontend route or button is not sufficient authorization.

## User-facing routes

| Route | Access and workflow |
| --- | --- |
| `/`, `/news-feed` | Shared News Feed for viewers and signed-in users. |
| `/events` | Redirects to the event-filtered News Feed. |
| `/login` | Sign in and signup dialog route. |
| `/account-reset` | Password-reset screen; the backend reset flow is still a mock confirmation. |
| `/booking` | Room catalog, schedule, and reservation request for any signed-in role. |
| `/my-activity` | The signed-in user's registrations, applications, and bookings. |
| `/archive` | Authenticated archive filtering and PDF/CSV download. |
| `/profile` | Authenticated display profile, school email, password, and correction requests. |
| `/council/applications` | Application review for Council and Admin. Council results are program-scoped by the backend. |
| `/council/members` | Council organization management for President, Vice President, and Secretary only. |
| `/admin` | Admin room requests, room availability, and closures. |
| `/admin/dashboard` | Admin-only system summary. |
| `/admin/people` | ACES organization management for Admin President, Vice President, and Secretary only. |
| `/support` | Support information. |

The compatibility routes `/council`, `/council/apply`, `/admin/bookings`, `/admin/events`, and `/admin/roles` redirect to the active shared workflows.

## Main workflows

### 1. Authentication, signup, and session

1. A viewer opens Login and enters a Student-ID and password.
2. The backend verifies the password, creates an in-memory session, and returns a bearer token plus the current user and capabilities.
3. The frontend stores the token according to “Remember me,” loads the scoped portal state, and renders routes for the current role/position.
4. Sign out deletes the current backend session and removes the browser token.

Signup requires Student-ID, name, course, year level, section, email, password, and a verified `signup` receipt. Email verification uses a six-digit OTP, a ten-minute default expiry, a 60-second resend delay, and a maximum of five failed attempts.

- With valid `GMAIL_USER` and `GMAIL_APP_PASSWORD`, Nodemailer sends the OTP.
- Without mail credentials in local development, the backend uses test code `123456`.
- Password reset currently returns a mock confirmation and does not complete a reset. Track this as QA-M011.

### 2. News Feed, publishing, and event registration

1. Everyone uses the shared feed and filters announcements, events, or council recruitment.
2. Council/Admin can publish an announcement, event, or recruitment form. Council recruitment is limited to the Council user's program.
3. A signed-in user opens an event and submits an individual or team registration.
4. The backend rejects duplicate submissions, closed forms, full capacity, invalid categories, and conflicting team membership.
5. A successful event registration is immediately marked `registered`, appears in My Activity, and is visible to Council/Admin participant views.

Event registration does not require approval. Team member account validation and privacy-safe aggregate counters are known gaps documented as QA-M006 and QA-M007.

### 3. Council application and role grant

1. A Student opens recruitment for their own program, answers every configured question, and submits.
2. The application is stored as `pending` and appears in My Activity.
3. Council reviewers see applications only for their own program; Admin can see all applications.
4. Council/Admin accepts or declines. A decline requires a reviewer note.
5. Acceptance atomically changes the applicant's authoritative membership to Council Member.
6. Session and portal-state reads resolve the new membership, so the accepted user receives Council capabilities without creating a replacement account.

### 4. Room booking and approval

1. A signed-in user selects a demo-week date, period, floor, room, purpose, and available From/To interval.
2. The backend validates the room, date, returned schedule window, elapsed time, timetable, existing pending/approved reservations, and active closures.
3. Student/Council requests are created as `pending`. Admin personal requests are created as `approved`.
4. Admin reviews pending requests in `/admin` and approves or declines them. A decline requires a reason.
5. The requester sees the updated status in My Activity after the mutation response or next refresh.

The confirmed target periods are 07:00–12:00 and 13:00–18:00, and Floor 4 must remain unavailable for details/reservation. The active seed currently differs; track QA-M004 and QA-M005 before treating booking as acceptance-complete.

### 5. Room closure and reopening

1. Admin opens Room Booking Access from `/admin`.
2. Admin chooses interval, whole day, whole week, or indefinite closure and supplies a reason.
3. The backend rejects invalid/overlapping closures and makes the closure part of booking conflict checks.
4. “Reopen room now” removes scheduled closures and an indefinite block for that room. Existing reservations remain.

Only Admin can create closures or reopen rooms.

### 6. Organization management and presidential succession

1. The top three positions open `/council/members` or `/admin/people` for their own organization.
2. President, Vice President, and Secretary may manage lower positions.
3. Only the President may appoint/change Vice President or Secretary.
4. Only the President may nominate a presidential successor from the current organization.
5. The nominee accepts or declines. Until acceptance, the current President remains in office.
6. Acceptance promotes the successor to President and demotes the outgoing President to Member in the same transaction.
7. Current-session permissions are resolved from the updated membership on later requests.

Treasurer and Auditor accounts must receive HTTP 403 from position-management and handover APIs, even if a frontend route is entered manually.

### 7. Profile, school email, and password

1. A signed-in user can change their display name/avatar or submit a correction request for official identity data.
2. A school-email change requires an `email-change` OTP receipt bound to the signed-in account and requested email.
3. A password change requires the current password, a different password of at least eight characters, and a `password-change` OTP receipt for the current account email.
4. Profile and credential mutations are performed by the backend before success is shown.

Email-domain/uniqueness validation, stale profile versions, and session revocation after password changes remain open findings in the QA report.

### 8. Dashboard and Archive

- `/admin/dashboard` is Admin-only and summarizes accounts, rooms, pending bookings, active events, and pending applications.
- `/archive` is authenticated and supports academic-year, semester, venue, and text filters.
- A user can download one archive record or a filtered/batch export as PDF or CSV.
- Backend export endpoints enforce authentication.

The current frontend/server search parameter and promised export branding/source fields are not fully aligned; track QA-M008 through QA-M010.

## Active backend API

All active business endpoints use the `/api` prefix.

| Method and path | Purpose / access |
| --- | --- |
| `GET /api/health` | Backend health and in-memory store status. |
| `POST /api/auth/sign-in` | Create a session. |
| `POST /api/auth/register` | Create a verified Student account. |
| `GET /api/auth/session` | Resolve current session and capabilities. |
| `POST /api/auth/sign-out` | Revoke the current session. |
| `POST /api/auth/verifications` | Request signup/email/password OTP. |
| `POST /api/auth/verifications/confirm` | Confirm OTP and receive a one-time receipt. |
| `POST /api/auth/password` | Change password with current password and receipt. |
| `POST /api/auth/password-reset` | Current mock reset acknowledgement. |
| `GET /api/portal/state` | Return public or caller-scoped portal state. |
| `POST /api/portal/bookings` | Create pending or Admin-approved booking. |
| `POST /api/portal/bookings/:id/decision` | Admin booking decision. |
| `POST /api/portal/closures` | Admin room closure. |
| `DELETE /api/portal/rooms/:id/closures` | Admin immediate reopening. |
| `POST /api/portal/posts` | Council/Admin publish. |
| `POST /api/portal/posts/:id/submissions` | Event registration or Council application. |
| `POST /api/portal/applications/:id/decision` | Council/Admin application decision. |
| `PATCH /api/portal/profiles/:id` | Own profile/email/correction mutation. |
| `PATCH /api/portal/members/:id/position` | Top-three organization position mutation. |
| `POST /api/portal/handovers` | President nominates successor. |
| `POST /api/portal/handovers/:id/respond` | Nominee response or President cancellation. |
| `GET /api/dashboard` | Admin-only metrics. |
| `GET /api/archive` | Authenticated archive records/filter metadata. |
| `GET /api/archive/export` | Authenticated filtered/batch PDF or CSV. |
| `GET /api/archive/:id/export` | Authenticated single-record PDF or CSV. |

Portal mutations return `{ data, state }`; `state` is a fresh snapshot scoped to the caller. Errors use `{ error: { code, message, details } }` with an appropriate HTTP status.

The old unprefixed `/venues`, `/reservations`, `/news-feed`, and `/admin/*` endpoint family belongs to the legacy backend and is not mounted by the active server.

## Run the integrated workflow locally

Use two terminals from the repository root after installing the existing workspace dependencies:

```powershell
npm ci
```

Terminal 1 — backend:

```powershell
npm run dev:backend
```

Terminal 2 — frontend:

```powershell
npm run dev:frontend
```

Then open the Vite address, normally `http://localhost:5173`. Verify the backend independently at `http://localhost:3000/api/health`.

Local frontend configuration is:

```dotenv
VITE_API_URL=/backend
```

The server loads `apps/server/.env`. Use [apps/server/.env.example](apps/server/.env.example) as the key list. Never commit real Gmail app passwords, JWT secrets, or production credentials.

### Local test accounts

These fixed accounts are for local demo/QA only. They must not be enabled with known passwords in production. Initial positions can change during organization workflows.

| Role / position | Student-ID | Local password |
| --- | --- | --- |
| Council President | `20240002-C` | `Council@123` |
| Council Vice President | `20240003-C` | `CouncilVP@123` |
| Council Secretary | `20240004-C` | `CouncilSec@123` |
| Council Treasurer | `20240005-C` | `CouncilTreas@123` |
| Council Auditor | `20240006-C` | `CouncilAudit@123` |
| Admin / ACES President | `20240001-A` | `Admin@123` |
| Admin / ACES Vice President | `20240003-A` | `AdminVP@123` |
| Admin / ACES Secretary | `20240004-A` | `AdminSec@123` |
| Admin / ACES Treasurer | `20240005-A` | `AdminTreas@123` |
| Admin / ACES Auditor | `20240006-A` | `AdminAudit@123` |
| Student | `20241200-C` | `Student@123` |
| Student | `20241201-C` | `Student2@123` |
| Student | `20241202-C` | `Student3@123` |

## Verification commands

Run from the repository root:

```powershell
npm run test:backend
npm run lint:frontend
npm run build:frontend
```

Run frontend logic tests with:

```powershell
$testFiles = @(rg --files apps/web/Frontend/src -g '*.test.js')
node --test --test-reporter=spec @testFiles
```

For a complete workflow check, use separate Viewer, Student, Council, and Admin browser sessions. Confirm that:

- Backend health succeeds before testing the frontend.
- A Student/Council booking becomes pending and an Admin can decide it.
- An accepted Council application changes the applicant's active access.
- Registration appears in My Activity and manager participant views.
- Treasurer/Auditor organization management is denied by the backend.
- A successful presidential handover updates both officers' permissions.
- Single and filtered/batch archive downloads return files.

## Current handoff boundary

The integrated in-memory workflow is suitable for local development and QA, not production deployment. The next team work should follow the severity order in [QA-BUG-AND-ISSUE-REPORT.md](QA-BUG-AND-ISSUE-REPORT.md):

1. Fix Critical and High authentication/security findings.
2. Consolidate/remove the legacy backend contract and keep `apps/server/src` authoritative.
3. Correct booking hours and Floor 4 availability.
4. Correct team validation, aggregate counts, archive filtering, and export contracts.
5. Complete password reset, email uniqueness/domain policy, profile concurrency, and session revocation.
6. Re-run role-by-role acceptance tests using the in-memory repository.
7. Hand the documented repository contracts to the database owner when the schema is ready; do not couple controllers or frontend components directly to a database.
