# Project IronClad — team workflow guide

Updated 21 October 2026, Asia/Manila. The approved frontend workflow is complete; real backend integration and system acceptance are the next phase.

## Rule: keep this file focused on workflows

**This file must only be a concise guide to the team's workflows.** Include user journeys, role responsibilities, important routes, approval steps, expected outcomes and the next workflow handoff. Add setup details only when needed to follow those workflows.

**Keep the workflow guidance self-contained.** Summarize the relevant decisions, current behavior and remaining workflow handoff directly here so teammates do not need the owner's personal handoff, private conversations or laptop-only documents.

Do not fill this guide with unrelated information, conversation transcripts, detailed task/checkpoint histories, machine-specific paths, local Git snapshots, production credentials, test logs or implementation internals. The supplied frontend test accounts below are included so teammates can exercise the workflows. When a workflow changes, update its summary here instead of appending a long history or directing readers to private reference files.

## File structure and contribution guides

Read [.github/CODEOWNERS](.github/CODEOWNERS) for the declared frontend, backend and database areas, and [apps/AGENTS.md](apps/AGENTS.md) for app contribution rules before changing frontend or backend files. The ownership file is named `CODEOWNERS` without a `.md` extension; the database directory is `packages/database` (plural `packages`).

```text
project-ironclad/
├── .github/CODEOWNERS          # Declared ownership areas
├── Team-Handoff.md             # This team workflow guide
├── apps/
│   ├── AGENTS.md               # Rules for work under apps/
│   ├── server/                 # Intended backend location
│   └── web/
│       └── Frontend/           # Active React/Vite frontend
│           └── src/
│               ├── main.jsx    # Frontend entry
│               ├── App.jsx     # App composition and routing
│               ├── pages/      # Admin, auth, Council, public, Student pages
│               ├── components/ # Shared and role-specific UI
│               ├── features/   # Student booking feature
│               ├── data/       # Approved local frontend workflows/accounts
│               ├── services/   # API/service integration boundaries
│               ├── hooks/      # Data and UI hooks
│               ├── context/    # Shared auth context
│               └── assets/     # Images, branding and UI assets
└── packages/
    └── database/               # Intended database/schema/migration location
```

`apps/server` is the single backend location; `packages/database` is the database location. Both currently contain only `.gitkeep`; backend/database implementation has not started. Use those directories for their respective work when that phase begins. The active frontend is `apps/web/Frontend`, not the older `apps/web/src` path.

## Role responsibilities

| Role | Main responsibilities |
| --- | --- |
| Viewer | Browse News Feed, filter content and view details; sign in before registration |
| Student | Register for events, apply to their program's council, request rooms and track their own activity |
| Council | Use shared account/booking features; publish news, event forms and recruitment; view registrations and review applications in the current frontend |
| Admin | Use shared account/booking features; manage room requests and closures, review applications in the current frontend and view Dashboard |
| President, Vice President and Secretary | Manage their own Council or ACES organization; lower positions do not have the management page |

## Main workflows

1. **News and publishing:** everyone uses the same News Feed. Filters show announcements, event registrations or council recruitment. Council/Admin publish the appropriate post/form; it appears in the feed and matching filter. Viewers can inspect details; Register opens login/signup when signed out.
2. **Event registration:** sign in → open an event → complete its individual or team form → submit → receive the registration result. Registration does not need approval. The participant sees it in My Activity; Council/Admin can inspect registered participants.
3. **Council application:** a Student opens recruitment for their own program → answers the form → submits a pending application → Council/Admin review and accept or decline it → the Student sees the result and any reviewer note in My Activity. Current frontend acceptance updates the application status; real Council access grants and production reviewer permissions require backend integration.
4. **Room booking:** select a room → select an available date and From/To interval → submit. Student/Council requests wait for Admin approval; Admin personal bookings are approved directly. Admin reviews requests in Rooms & Reservations, approves or declines them, and the requester sees the result in My Activity. Intervals must fit availability without overlapping schedules or closures. Room selection persists when changing filters; selecting the same room again deselects it.
5. **Room closure:** Admin opens Room Booking Access → chooses a room and an interval, whole day, whole week or closure until reopened → provides a reason → saves. Whole-day/week choices hide time controls. Admin can reopen the room immediately, including during a scheduled closure.
6. **Organization management:** the top three officers use Council Members or People & Roles within their organization. The President nominates a successor → the successor accepts or declines → acceptance transfers the presidency and makes the outgoing President a Member → the new President appoints officers. The President appoints/changes the Vice President and Secretary; lower management positions cannot change those executive offices.
7. **Profile and account:** edit display name/avatar or request a correction to official identity records. School Email is required. Signup, password change and email change use verification screens; real verification requires backend delivery. In the disconnected email-change preview, no email change is saved. Logout requires confirmation.
8. **Archive:** open Archive → filter records → download a single record or filtered/batch export as PDF or CSV. PDF uses the system branding; CSV contains record/source information. Real data access and export permissions will be enforced by the backend.

## Where to go

| Route | Workflow / access |
| --- | --- |
| `/`, `/news-feed` | Shared feed; filter announcements, events or recruitment |
| `/booking` | Personal booking for signed-in Student, Council and Admin |
| `/my-activity` | Own applications, registrations and bookings |
| `/archive`, `/profile` | Archive exports and account/profile controls |
| `/council/applications` | Application review for Council/Admin in the current frontend |
| `/council/members` | Council organization management; top three positions |
| `/admin` | Rooms & Reservations; Admin |
| `/admin/dashboard` | Dashboard; all Admin positions |
| `/admin/people` | ACES People & Roles; top three positions |

## Run the workflow locally

From the repository root, using the team's current source and existing package versions:

```powershell
npm ci
npm run dev --workspace=apps/web/Frontend
```

Open the address printed by Vite and sign in using a frontend test account below. Browser-local records are shared within the same browser/origin; another device, browser profile or port has separate data.

### Frontend test accounts

These 13 fixed accounts support local frontend workflow testing. Real backend accounts and authentication are still pending. Positions shown are initial defaults; saved appointments and accepted handovers determine the account's current position. All Council accounts belong to BSCS.

| Role / Position | Student-ID | Password |
| --- | --- | --- |
| Council President | 20240002-C | `Council@123` |
| Council Vice President | 20240003-C | `CouncilVP@123` |
| Council Secretary | 20240004-C | `CouncilSec@123` |
| Council Treasurer | 20240005-C | `CouncilTreas@123` |
| Council Auditor | 20240006-C | `CouncilAudit@123` |
| Admin — ACES President | 20240001-A | `Admin@123` |
| Admin — ACES Vice President | 20240003-A | `AdminVP@123` |
| Admin — ACES Secretary | 20240004-A | `AdminSec@123` |
| Admin — ACES Treasurer | 20240005-A | `AdminTreas@123` |
| Admin — ACES Auditor | 20240006-A | `AdminAudit@123` |
| Student | 20241200-C | `Student@123` |
| Student | 20241201-C | `Student2@123` |
| Student | 20241202-C | `Student3@123` |

## Next workflow handoff

The current app runs the requested frontend system using browser-local data. The backend phase must connect real authentication/email verification, saved records, server permissions, role grants and live updates to these workflows. The team must confirm authoritative reviewer permissions before production use; current local application review includes both Council and Admin.

| Workflow | Frontend behavior delivered | Backend handoff still needed |
| --- | --- | --- |
| Accounts and Profile | Login/role views, display-name/avatar editing, official-record correction requests and verification screens; email changes wait for verification | Real account/session handling, email delivery and verification, saved profile/correction processing and confirmed credential/email changes |
| Booking and room access | Available From/To selection, pending Student/Council requests, Admin decisions, closures and immediate reopening | Persist rooms/schedules/requests; enforce conflicts and permissions on the server; deliver the result to the requester |
| Council membership and officers | Recruitment/application/review flow, program-scoped management and nomination/acceptance succession | Confirm reviewer scope; persist decisions/appointments; grant or revoke actual access and refresh affected sessions |
| News and event registration | Shared filtered feed, publishing, individual/team registration, participant lists and My Activity | Persist posts/forms/registrations; enforce eligibility/capacity; update all affected users' feeds and records |
| Dashboard and Archive | Admin overview, filtered records and PDF/CSV downloads | Supply authoritative scoped metrics/records and enforce export access |

Agree backend ownership and contracts, connect each workflow, then verify it across the affected roles against persisted server data. In particular, confirm that a requester sees an Admin's booking decision, an applicant receives the intended access after acceptance, and a presidential handover updates both officers' permissions. Keep these workflow summaries aligned with the delivered behavior.
