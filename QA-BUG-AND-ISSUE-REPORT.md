# IronClad QA Bug & Discrepancy Report

> Internal engineering document. This report contains security-sensitive findings and should not be published outside the project team.

## Audit metadata

| Item | Value |
| --- | --- |
| Audit date | 22 October 2026 (Asia/Manila) |
| Audited branch | `Backend/adminRole_councilRole_studentRole_Merger` |
| Audited commit | `d23a27b` |
| Database constraint | In-memory repositories only; no database, ORM, schema, or migration was added or tested |
| Test result | Backend: 54/54 passed; Frontend: 155/155 passed; Frontend ESLint passed |
| Dependency audit | `npm audit` and `npm audit --omit=dev`: 0 known vulnerabilities |
| Modification policy during audit | Read-only; the audit did not change application code or tests |

Passing automated tests do **not** mean the system is production-ready. Several security and contract problems below are not covered by the current test suites.

## Executive summary

| Severity | Count |
| --- | ---: |
| Critical / Blocker | 3 |
| High / RBAC Security | 4 |
| Medium / Functional | 15 |
| Low / UI & Edge Case | 4 |
| **Total** | **26** |

The most urgent release blockers are fixed demo credentials being usable in every environment, a production OTP fallback that accepts the known code `123456` when email is not configured, and an unauthenticated endpoint that resets all in-memory server data. The project should not be exposed to an untrusted network until the Critical and High findings are resolved.

---

## Critical / Blocker

### QA-C001 — Fixed test credentials remain valid in every environment

- **Affected workflow and roles:** Authentication; Admin, Council, and Student accounts.
- **Evidence:** [apps/server/src/data/seed.js, lines 7–20](apps/server/src/data/seed.js#L7-L20), [apps/server/src/data/seed.js, lines 48–54](apps/server/src/data/seed.js#L48-L54)
- **Current behavior:** Thirteen accounts with predictable IDs and plaintext source-level passwords are always loaded into the active repository. There is no environment guard that limits these accounts to local development.
- **Expected behavior:** Demo identities must be unavailable in production, or must receive deployment-specific secrets through a controlled bootstrap process.
- **How to reproduce:** Start the server with `NODE_ENV=production`, then submit one of the credential pairs present in `accountRows` to `POST /api/auth/sign-in`. Authentication succeeds.
- **Impact:** Anyone with repository or handoff access can obtain Admin or Council privileges in a deployed instance.

### QA-C002 — OTP verification fails open to `123456` in production when email delivery is unavailable

- **Affected workflow and roles:** Signup, password change, and school-email change; all users.
- **Evidence:** [apps/server/src/services/AuthService.js, lines 74–92](apps/server/src/services/AuthService.js#L74-L92), [apps/server/src/config.js, lines 13–16](apps/server/src/config.js#L13-L16)
- **Current behavior:** When Nodemailer delivery is not enabled, the server stores the fixed OTP `123456`. Production mode hides `mockCode` from the response but still accepts the fixed code.
- **Expected behavior:** Production verification requests must fail closed when delivery is unavailable; a predictable fallback OTP must never verify ownership.
- **How to reproduce:** Run with `NODE_ENV=production` and without valid `GMAIL_USER`/`GMAIL_APP_PASSWORD`, request a verification challenge, then confirm it using `123456`. The server returns a valid verification receipt.
- **Impact:** Email ownership can be bypassed for account creation and protected account changes.

### QA-C003 — Public test reset endpoint erases all in-memory state

- **Affected workflow and roles:** All workflows and all roles.
- **Evidence:** [apps/server/src/app.js, line 113](apps/server/src/app.js#L113), [apps/server/src/config.js, line 13](apps/server/src/config.js#L13)
- **Current behavior:** Whenever `NODE_ENV` is anything other than exactly `production`—including when it is missing—`POST /api/test/reset` is mounted without authentication or authorization and resets the repository.
- **Expected behavior:** Destructive test controls must only exist inside the automated-test harness or require a separate explicit test flag and authorization.
- **How to reproduce:** Start the backend with its current/default environment and call `POST /api/test/reset` without an `Authorization` header. It returns HTTP 200 and deletes runtime mutations.
- **Impact:** Any client able to reach the server can erase bookings, applications, registrations, profile changes, and other in-memory activity.

---

## High / RBAC Security

### QA-H001 — Known fallback JWT secret can extend an existing session beyond its server expiry

- **Affected workflow and roles:** Authentication/session management; all signed-in roles.
- **Evidence:** [apps/server/src/config.js, line 9](apps/server/src/config.js#L9), [apps/server/src/services/AuthService.js, lines 52–69](apps/server/src/services/AuthService.js#L52-L69), [apps/server/src/security/jwt.js, lines 8–27](apps/server/src/security/jwt.js#L8-L27)
- **Current behavior:** If `JWT_SECRET` is missing, a source-known secret is used. Authentication verifies the JWT `exp` and checks that its `jti` exists, but does not compare the stored session's `expiresAt` with the current time.
- **Expected behavior:** Startup should reject a missing production secret, and both the signed token expiry and authoritative stored-session expiry must be enforced.
- **How to reproduce:** Sign in, retain the token's `sub` and `jti`, wait until the original expiry, then sign a replacement token with the fallback secret and a later `exp`. The replacement is accepted while the same repository session remains present.
- **Impact:** A leaked session identifier can be prolonged by anyone who knows the fallback secret.

### QA-H002 — Every authenticated Student receives the entire account directory and membership map

- **Affected workflow and roles:** Portal state/profile/organization data; Student role and all authenticated users.
- **Evidence:** [apps/server/src/services/PortalService.js, lines 38–58](apps/server/src/services/PortalService.js#L38-L58)
- **Current behavior:** `GET /api/portal/state` returns all accounts through `directory` and all organization memberships through `members` to any signed-in user. Directory entries include school email and role/position details.
- **Expected behavior:** Return only fields and records required by the caller's role and workflow. Administrative and organization directory data must be server-scoped.
- **How to reproduce:** Sign in as the basic Student test account and request `GET /api/portal/state`. The response contains all 13 directory entries and all 13 memberships.
- **Impact:** Unnecessary disclosure of school email addresses and organization structure, with easy enumeration of privileged accounts.

### QA-H003 — Sign-in has no throttling and performs synchronous password hashing

- **Affected workflow and roles:** Authentication availability; all users.
- **Evidence:** [apps/server/src/app.js, line 74](apps/server/src/app.js#L74), [apps/server/src/services/AuthService.js, lines 52–60](apps/server/src/services/AuthService.js#L52-L60), [apps/server/src/security/password.js](apps/server/src/security/password.js)
- **Current behavior:** Repeated sign-in attempts are unrestricted. Each attempt uses synchronous password verification on the Node.js event loop, and the password input has no server-side maximum length.
- **Expected behavior:** Enforce per-account/per-origin throttling, a bounded payload/password length, and a password verification strategy that does not allow trivial event-loop exhaustion.
- **How to reproduce:** Send many parallel invalid `POST /api/auth/sign-in` requests. Requests are not rate-limited and synchronous crypto work delays unrelated traffic.
- **Impact:** Credential stuffing and low-cost denial of service.

### QA-H004 — Password changes do not revoke existing sessions

- **Affected workflow and roles:** Password change/account recovery; all signed-in roles.
- **Evidence:** [apps/server/src/services/AuthService.js, lines 142–147](apps/server/src/services/AuthService.js#L142-L147), [apps/server/src/services/AuthService.js, lines 62–72](apps/server/src/services/AuthService.js#L62-L72)
- **Current behavior:** Changing the password updates only `passwordHash`. Existing sessions for the account remain valid until their JWT expires or they are individually signed out.
- **Expected behavior:** A successful password change should revoke all other sessions, or rotate an account-level session/security version.
- **How to reproduce:** Sign in twice, change the password with session A, then call an authenticated endpoint with session B. Session B remains accepted.
- **Impact:** A stolen session survives the account owner's security response.

---

## Medium / Functional

### QA-M001 — Two backend implementations expose conflicting API contracts

- **Affected workflow and roles:** News feed, booking, Admin pages, authentication; all roles.
- **Evidence:** Active routes at [apps/server/src/app.js, lines 73–114](apps/server/src/app.js#L73-L114); legacy routes at [apps/server/backend/src/app.js, lines 228–462](apps/server/backend/src/app.js#L228-L462); legacy frontend adapters at [apps/web/Frontend/src/services/booking.js, lines 14–37](apps/web/Frontend/src/services/booking.js#L14-L37), [apps/web/Frontend/src/services/newsFeed.js, lines 8–12](apps/web/Frontend/src/services/newsFeed.js#L8-L12), and [apps/web/Frontend/src/services/admin.js, lines 69–74](apps/web/Frontend/src/services/admin.js#L69-L74)
- **Current behavior:** The active server mounts consolidated `/api/...` routes. It does not mount `/venues`, `/reservations/*`, `/news-feed`, or `/admin/*`, while older frontend services still call those legacy paths. The old routes live under `apps/server/backend/src` but are not the standard runtime.
- **Expected behavior:** One authoritative server implementation and one documented API contract should serve all active frontend paths.
- **How to reproduce:** Start the backend using the root `dev:backend` script, then call `GET /venues` or `GET /news-feed`. The active server returns HTTP 404 `ROUTE_NOT_FOUND`.
- **Impact:** Depending on which frontend composition/service is used, pages show “Route does not exist” even while the backend is running.

### QA-M002 — Legacy backend remains testable and contains weaker security behavior

- **Affected workflow and roles:** Authentication and OTP; all roles using or testing legacy services.
- **Evidence:** [apps/server/backend/package.json, lines 7–9](apps/server/backend/package.json#L7-L9), [apps/server/backend/src/services/portalService.js, lines 98–106](apps/server/backend/src/services/portalService.js#L98-L106), [apps/server/backend/src/services/portalService.js, lines 184–188](apps/server/backend/src/services/portalService.js#L184-L188), [apps/server/backend/src/data/portalDemoData.js, lines 26–30](apps/server/backend/src/data/portalDemoData.js#L26-L30)
- **Current behavior:** The legacy tree has its own package and tests, uses plaintext password comparison/storage, and returns the fixed OTP in API responses. Its start command points to the active server while its tests instantiate legacy code directly.
- **Expected behavior:** Remove or clearly archive the legacy runtime, or migrate every required legacy route behind the active secure service/repository boundary.
- **How to reproduce:** Run the legacy package tests and inspect the instantiated app/services; then run its `start` command and observe that a different server implementation starts.
- **Impact:** Developers can test one implementation and run another, allowing insecure or incompatible behavior to be reintroduced during merges.

### QA-M003 — Production frontend API connectivity depends on an undocumented reverse proxy

- **Affected workflow and roles:** Every API-backed page; all roles, especially Cloudflare/mobile deployments.
- **Evidence:** [apps/web/Frontend/vite.config.js, lines 8–14](apps/web/Frontend/vite.config.js#L8-L14), [apps/web/Frontend/src/services/api.js, line 39](apps/web/Frontend/src/services/api.js#L39), [apps/web/Frontend/src/services/portal.js, lines 49–54](apps/web/Frontend/src/services/portal.js#L49-L54)
- **Current behavior:** Development works through Vite's proxy to `127.0.0.1:3000`. With no `VITE_API_URL`, production requests are same-origin `/api/...`, but the repository contains no production reverse-proxy configuration that forwards them to Express.
- **Expected behavior:** Document and provide a deployment contract: either set a reachable backend origin or deploy a same-origin proxy for `/api`.
- **How to reproduce:** Serve only the built frontend through a tunnel/static host without an API reverse proxy and attempt sign-in. The browser receives a network error or a frontend-host 404.
- **Impact:** The app appears healthy while every backend workflow is unavailable outside Vite development.

### QA-M004 — Floor 4 rooms are reservable in the active backend

- **Affected workflow and roles:** Room booking; Student, Council, and Admin.
- **Evidence:** Active room seed at [apps/server/src/data/seed.js, lines 23–31](apps/server/src/data/seed.js#L23-L31); active booking validation at [apps/server/src/services/PortalService.js, lines 65–95](apps/server/src/services/PortalService.js#L65-L95); required unavailable behavior at [apps/server/backend/src/data/demoData.js, line 81](apps/server/backend/src/data/demoData.js#L81) and [apps/server/backend/src/services/bookingService.js, lines 129–132](apps/server/backend/src/services/bookingService.js#L129-L132)
- **Current behavior:** Active room records have no `is_details_available` flag and the active booking service only checks `room.blocked`. Rooms 401–404 can therefore receive bookings.
- **Expected behavior:** Floor 4 details are unavailable and its venues are never lockable/reservable.
- **How to reproduce:** Sign in and submit a valid `POST /api/portal/bookings` request for Room 401. The server returns HTTP 201 with a pending booking.
- **Impact:** The current integrated booking workflow violates the agreed venue rules.

### QA-M005 — Active booking hours do not match the agreed 07:00–12:00 and 13:00–18:00 windows

- **Affected workflow and roles:** Room booking; all booking-capable roles.
- **Evidence:** [apps/server/src/data/seed.js, line 85](apps/server/src/data/seed.js#L85), [apps/web/Frontend/src/data/portal-api-store.js, lines 1–12](apps/web/Frontend/src/data/portal-api-store.js#L1-L12), compared with [apps/server/backend/test/booking-api.test.js, lines 27–28](apps/server/backend/test/booking-api.test.js#L27-L28)
- **Current behavior:** The active server defines morning as 08:00–13:30 and evening as 13:30–21:30. The confirmed requirement is morning 07:00–12:00 and evening 13:00–18:00.
- **Expected behavior:** Use the confirmed windows consistently in the authoritative backend and frontend fallback data.
- **How to reproduce:** Submit a morning booking for 07:00–08:00 through `POST /api/portal/bookings`. The server returns HTTP 422 `INVALID_TIME`.
- **Impact:** Valid requests are rejected, while requests outside the confirmed closing hours may be accepted.

### QA-M006 — Feed capacity/application totals are incorrect for Students and signed-out viewers

- **Affected workflow and roles:** News feed/event cards; Viewer and Student roles.
- **Evidence:** Server-side scoping at [apps/server/src/services/PortalService.js, lines 41–47](apps/server/src/services/PortalService.js#L41-L47); client aggregation at [apps/web/Frontend/src/components/common/SystemFeed.jsx, lines 40–53](apps/web/Frontend/src/components/common/SystemFeed.jsx#L40-L53)
- **Current behavior:** The server intentionally returns only the current Student's registrations/applications, and none to a viewer. The frontend derives global event/council counters from those scoped arrays, so totals appear as zero or one rather than the true capacity usage.
- **Expected behavior:** Return privacy-safe aggregate counts separately from caller-specific submission details.
- **How to reproduce:** Create registrations using two accounts, sign in as one Student (or sign out), and view the event card. Its displayed total does not represent all registrations.
- **Impact:** Capacity indicators and recruitment/application metrics mislead users.

### QA-M007 — Team registration accepts nonexistent or malformed student identities

- **Affected workflow and roles:** Team event registration; Student and Council participants.
- **Evidence:** [apps/server/src/services/PortalService.js, lines 192–196](apps/server/src/services/PortalService.js#L192-L196)
- **Current behavior:** The server checks team length, uniqueness, requester inclusion, and conflicts, but never validates teammate IDs against accounts or the student ID format.
- **Expected behavior:** Every team member should be a valid, eligible campus account and should satisfy any event eligibility rules.
- **How to reproduce:** Submit a team containing the requester plus arbitrary IDs such as `X`, `Y`, `Z`, and `NOT-A-STUDENT`, while meeting the configured team size. The registration is accepted.
- **Impact:** Participant lists and capacity can be filled with fabricated identities.

### QA-M008 — Archive export ignores the UI search filter

- **Affected workflow and roles:** Archive batch export; all signed-in roles.
- **Evidence:** [apps/web/Frontend/src/pages/student/Archive.jsx, line 51](apps/web/Frontend/src/pages/student/Archive.jsx#L51), [apps/web/Frontend/src/services/portal.js, lines 49–54](apps/web/Frontend/src/services/portal.js#L49-L54), [apps/server/src/services/PortalService.js, lines 305–308](apps/server/src/services/PortalService.js#L305-L308)
- **Current behavior:** The UI/export request sends `search`, while the backend filters only on `q`.
- **Expected behavior:** The client and server must use one documented query property and export exactly the displayed selection.
- **How to reproduce:** Enter a search with no matches and export all displayed results. `search=no-match` returns the complete archive; changing the query manually to `q=no-match` yields no records/404 during export.
- **Impact:** Users can download records excluded by their visible selection.

### QA-M009 — Server exports do not match the UI's promised PDF/CSV content

- **Affected workflow and roles:** Archive exports; all signed-in roles.
- **Evidence:** UI promise at [apps/web/Frontend/src/pages/student/Archive.jsx, lines 182–203](apps/web/Frontend/src/pages/student/Archive.jsx#L182-L203); server generation at [apps/server/src/app.js, lines 19–42](apps/server/src/app.js#L19-L42) and [apps/server/src/app.js, lines 99–108](apps/server/src/app.js#L99-L108)
- **Current behavior:** The generated PDF is plain Helvetica text without the IronClad logo/campus theme, and the CSV fields omit the promised `Source` column.
- **Expected behavior:** Either generate the branded/content-complete exports described by the UI and data contract, or change the product contract before release.
- **How to reproduce:** Download a batch PDF and CSV from Archive, inspect the PDF visually, and inspect the CSV header.
- **Impact:** Exported documents do not meet the declared user-facing contract.

### QA-M010 — Dashboard and archive read APIs are bypassed by the default frontend

- **Affected workflow and roles:** Admin dashboard and Archive; Admin and all signed-in roles.
- **Evidence:** Local derivation at [apps/web/Frontend/src/components/common/FrontendSystem.jsx, lines 65–96](apps/web/Frontend/src/components/common/FrontendSystem.jsx#L65-L96) and [apps/web/Frontend/src/components/common/SystemDashboard.jsx, lines 18–25](apps/web/Frontend/src/components/common/SystemDashboard.jsx#L18-L25); server routes at [apps/server/src/app.js, lines 97–111](apps/server/src/app.js#L97-L111)
- **Current behavior:** The default composition derives dashboard and archive data from the broad portal snapshot instead of using `GET /api/dashboard` and `GET /api/archive`. Only file download uses archive endpoints.
- **Expected behavior:** Protected server resources should be the authority for role-scoped counts, records, and filters.
- **How to reproduce:** Instrument or temporarily deny the dashboard/archive read endpoints and open the corresponding default pages. Their data can still render from portal state.
- **Impact:** Authorization and filtering can diverge between UI and the dedicated server endpoints.

### QA-M011 — Password reset reports success but performs no reset workflow

- **Affected workflow and roles:** Forgot password; signed-out users.
- **Evidence:** [apps/server/src/services/AuthService.js, lines 136–139](apps/server/src/services/AuthService.js#L136-L139), route at [apps/server/src/app.js, line 76](apps/server/src/app.js#L76)
- **Current behavior:** The endpoint validates the email shape and always returns a confirmation message. It creates no challenge/reset token, sends no email, and cannot change a password.
- **Expected behavior:** Issue an expiring, single-use reset challenge and require it before setting a new password, while retaining a non-enumerating response.
- **How to reproduce:** Call `POST /api/auth/password-reset` for an existing account and follow the returned response. There is no usable continuation or state change.
- **Impact:** Users who forget their passwords cannot recover their accounts.

### QA-M012 — Signup consumes the OTP receipt before validating all account fields

- **Affected workflow and roles:** Signup; new Students.
- **Evidence:** [apps/server/src/services/AuthService.js, lines 120–133](apps/server/src/services/AuthService.js#L120-L133)
- **Current behavior:** The verification receipt is consumed at line 125 before `name`, `course`, `yearLevel`, and `section` are validated at lines 128–130.
- **Expected behavior:** Validate the entire request first, then atomically consume the receipt and create the account.
- **How to reproduce:** Verify an email, then submit registration with a valid receipt but a missing/invalid name or course. Correct the field and retry using the same receipt; it has already been consumed.
- **Impact:** A normal validation error forces users to restart email verification.

### QA-M013 — School-email updates allow duplicates and arbitrary domains

- **Affected workflow and roles:** Profile/email change; all signed-in roles.
- **Evidence:** [apps/server/src/services/PortalService.js, lines 226–240](apps/server/src/services/PortalService.js#L226-L240), generic email validation at [apps/server/src/services/PortalService.js, lines 7–13](apps/server/src/services/PortalService.js#L7-L13)
- **Current behavior:** The service checks only general email syntax and receipt ownership. It does not enforce a campus domain or reject an email already assigned to another account.
- **Expected behavior:** Enforce the agreed school-email domain policy and uniqueness before verification/commit.
- **How to reproduce:** Request and confirm an email-change challenge for a syntactically valid non-campus address, or use another account's address, then save the profile. The update is accepted.
- **Impact:** Duplicate identity data and misleading “school email verified” status.

### QA-M014 — Profile optimistic-concurrency version is ignored

- **Affected workflow and roles:** Profile editing; all signed-in roles.
- **Evidence:** [apps/server/src/services/PortalService.js, lines 226–242](apps/server/src/services/PortalService.js#L226-L242)
- **Current behavior:** Stored profile versions are incremented, but the incoming version is never compared with the current record.
- **Expected behavior:** Reject stale writes with HTTP 409 or document last-write-wins and remove the misleading concurrency field.
- **How to reproduce:** Load the same profile in two clients, save different edits from both using the same original version, and observe the second silently overwrite the first.
- **Impact:** Concurrent profile changes are lost without warning.

### QA-M015 — Team guidance describes a pre-backend architecture and is now misleading

- **Affected workflow and roles:** Development, onboarding, QA, and deployment; all contributors.
- **Evidence:** [Team-Handoff.md, lines 3–5](Team-Handoff.md#L3-L5), [Team-Handoff.md, lines 89–121](Team-Handoff.md#L89-L121), [apps/AGENTS.md, line 10](apps/AGENTS.md#L10), [apps/AGENTS.md, lines 30–39](apps/AGENTS.md#L30-L39)
- **Current behavior:** The handoff says real backend work is still pending, and `apps/AGENTS.md` says `apps/server` contains only `.gitkeep`. Both statements conflict with the active Express server and integrated API store.
- **Expected behavior:** Architecture and workflow documents should identify `apps/server/src` as authoritative, explain the legacy `apps/server/backend` tree, and document current run/test/deployment commands.
- **How to reproduce:** Follow the written instructions as a new contributor and compare them with the repository/package scripts.
- **Impact:** Contributors can edit the wrong backend, run the wrong tests, or incorrectly assume server-side controls do not exist.

---

## Low / UI & Edge Case

### QA-L001 — Development OTP is not surfaced when SMTP is intentionally disabled

- **Affected workflow and roles:** Local signup/password/email verification; developers and testers.
- **Evidence:** Server response at [apps/server/src/services/AuthService.js, lines 83–92](apps/server/src/services/AuthService.js#L83-L92); UI handling at [apps/web/Frontend/src/components/common/EmailVerification.jsx, lines 23–42](apps/web/Frontend/src/components/common/EmailVerification.jsx#L23-L42) and [apps/web/Frontend/src/components/common/EmailVerification.jsx, lines 81–108](apps/web/Frontend/src/components/common/EmailVerification.jsx#L81-L108)
- **Current behavior:** In non-production without email delivery, the server returns `mockCode`, but the connected verification UI only displays a code for its separate `preview` state and does not display `challenge.mockCode`.
- **Expected behavior:** Local test mode should clearly surface the backend-provided mock code, or require SMTP and fail with a clear configuration message.
- **How to reproduce:** Run without Gmail configuration, use the connected signup flow, and request a code. No email arrives and the page only instructs the user to check email.
- **Impact:** Local verification appears broken even though the backend generated a test code.

### QA-L002 — Feed details dialog bypasses the card's disabled action state

- **Affected workflow and roles:** News/event registration and council application; Viewer, Student, and Council.
- **Evidence:** Card action derivation at [apps/web/Frontend/src/components/common/SystemFeed.jsx, lines 40–57](apps/web/Frontend/src/components/common/SystemFeed.jsx#L40-L57); details action at [apps/web/Frontend/src/components/common/SystemFeed.jsx, lines 64–67](apps/web/Frontend/src/components/common/SystemFeed.jsx#L64-L67)
- **Current behavior:** The card derives `mine`, `closed`, and `eligible` states, but the details dialog always shows an active Register/Apply button for non-announcements and calls `act(post)` directly.
- **Expected behavior:** The modal must use the same disabled reason and action label as the card. Server rejection remains the final authority.
- **How to reproduce:** Open details for an already-registered, closed, full, or ineligible item and click the action button.
- **Impact:** Users are led into avoidable error responses and see inconsistent action state.

### QA-L003 — Vite accepts every Host header

- **Affected workflow and roles:** Development/tunnel hosting; all users of the dev server.
- **Evidence:** [apps/web/Frontend/vite.config.js, line 8](apps/web/Frontend/vite.config.js#L8)
- **Current behavior:** `allowedHosts: true` disables Vite host allow-list validation.
- **Expected behavior:** Enumerate localhost and the intended tunnel/development host patterns, particularly when proxying authenticated API traffic.
- **How to reproduce:** Send the Vite dev server a request with an arbitrary `Host` header; it is accepted.
- **Impact:** Broadens DNS-rebinding/host-header exposure in shared development environments.

### QA-L004 — RBAC regression tests do not cover every named restricted account/position

- **Affected workflow and roles:** Organization management; Council Treasurer/Auditor, Admin Treasurer/Auditor, Vice President, and Secretary.
- **Evidence:** Existing single restriction case at [apps/server/test/portal-api.test.js, lines 97–98](apps/server/test/portal-api.test.js#L97-L98); implementation at [apps/server/src/services/PortalService.js, lines 245–258](apps/server/src/services/PortalService.js#L245-L258)
- **Current behavior:** The implementation contains the expected top-three and President-only checks, but the backend test explicitly exercises only one Treasurer denial against one target. It does not independently lock in the required behavior for Council Auditor, Admin Treasurer, Admin Auditor, or the Vice President/Secretary executive-position restriction matrix.
- **Expected behavior:** Add parameterized API tests for every named restricted account and position from the handoff requirements.
- **How to reproduce:** Review the backend tests for student IDs `20240005-C`, `20240006-C`, `20240005-A`, and `20240006-A`, plus VP/Secretary attempts to change VP/Secretary positions. The full matrix is absent.
- **Impact:** A future RBAC regression could pass the test suite.

---

## Verified behaviors that are currently working

These checks passed and should not be reported as defects unless later changes regress them:

- Student and Council room requests are created as `pending`; Admin personal bookings are auto-approved.
- Approved/pending booking conflicts and active room closures are enforced server-side, including immediate reopening.
- Accepting a Council application updates membership, and current session payloads resolve the updated role.
- Treasurer/Auditor route gating and President-only executive-position restrictions exist in the current implementation.
- Accepting presidential succession promotes the incoming member and demotes the outgoing President.
- Archive and dashboard endpoints require authentication; the dashboard endpoint additionally requires Admin role.
- OTP codes are six digits, expire, are resend-throttled, and are consumed after successful verification; the production fail-open condition is documented separately in QA-C002.

## Recommended triage order

1. Block release and fix QA-C001 through QA-C003.
2. Resolve session/authentication weaknesses QA-H001 through QA-H004.
3. Choose one authoritative backend/API contract (QA-M001 and QA-M002), then update the deployment contract (QA-M003).
4. Repair booking rules and data integrity issues (QA-M004, QA-M005, QA-M007).
5. Correct response scoping/aggregates and export contracts (QA-M006, QA-M008 through QA-M010).
6. Complete account lifecycle and concurrency behavior (QA-M011 through QA-M014).
7. Update contributor documentation and close the UI/test gaps.

## Revalidation checklist

After fixes, rerun all backend/frontend tests and add targeted regression tests for each Critical and High issue. Then verify the complete workflows in a browser using separate Viewer, Student, Council, and Admin sessions. Do not use a live database during this phase; keep persistence behind the existing in-memory repository interfaces until the database team supplies the schema.
