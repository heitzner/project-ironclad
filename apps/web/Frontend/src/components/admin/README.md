# Admin page structures

These four pages reuse the existing shared layout, navbar, footer, page header,
and progress bar. No application routes, authentication, services, student pages,
dependencies, or build configuration were changed.

## Open the preview

1. Open a terminal in `D:/ADVANCED WEB/project-ironclad/apps/web/Frontend`.
2. Run `npm run dev -- --port 5173 --strictPort`.
3. Open `http://localhost:5173/src/components/admin/preview.html`.
4. Use Dashboard, Room Bookings, Campus Events, and User Management in the sidebar.
5. In Campus Events, open **Add/Create Event** to inspect its form. In User
   Management, open **Set council role** to inspect its confirmation form.
6. Use the **Preview state** selector to inspect loading, error/retry, and
   signed-out access states. This is a design preview with no live user account.

If port 5173 is already serving a different project, leave it running and use
`npm run dev -- --port 5174 --strictPort`, then replace 5173 with 5174 in the URL.

Saving is deliberately disabled in this preview. There are no demo credentials,
invented users, seeded bookings, or simulated successful updates.

## Future integration contract

Integration is outside the authorized page-only scope. Each page accepts:

- `user`: validated server account `{ id, role, disabled? }`.
- `onNavigate(section)`: connect to application routing later.
- `loading`, `error`, `onRetry`: supplied by the future data hook.
- `preview`: only for the isolated design preview; keep false on real routes.

Without `preview`, the page shell requires an active administrator account before
rendering page content. This is a presentation guard, not server authentication.
The preview entry supplies no records and cannot save changes.

Data props must be arrays returned from services. Undefined means disconnected;
an empty array means an actual empty response. Use stable string IDs consistently.

- `rooms`: `{ id, number, name, location, floor, capacity, occupancy, utilization? }`.
  Occupancy is `occupied`, `pending`, or `empty`; utilization is a percentage.
- `bookings`: `{ id, roomId, roomName?, requesterId?, requesterName?, startsAt,
  endsAt, status, version? }`. Status is `pending`, `approved`, or `denied`.
  Times must be ISO timestamps with a time-zone offset.
- `events`: `{ id, title, description, venueId, venueName?, startsAt, endsAt,
  status, category?, bannerUrl?, registered?, capacity?, version? }`.
- `members`: `{ id, name, studentId, section, status, role, councilRoleId?,
  disabled?, version? }`.
- `roles`: `{ id, name, scope }`; only `scope: 'council'` can be assigned here.
- `venues`: `{ id, name }`.

Mutation callbacks resolve only after a real service response; reject with a safe
user-facing Error on failure. No optimistic local record updates are performed.
The integration must refetch authoritative data after every successful mutation.

- `onDecision(bookingId, { status, reason, version })`.
- `onSaveEvent({ id?, title, description, venueId, startsAt, endsAt, version? })`.
- `onCompleteEvent(eventId, { version })`.
- `onSaveRole(memberId, { councilRoleId, version })`; null removes an assignment.

The server must independently enforce permissions, account verification,
allowed status transitions, request versions, and atomic booking conflict checks.
The council editor blocks all changes to administrator accounts and self-role
changes; administrator creation/removal belongs in a separate protected workflow.
Never infer a trusted role from a username, URL, or browser storage.

## Verification

Run `npm run lint`. Run the booking and validation checks with:
`node --test src/features/student-booking/booking.logic.test.js src/components/admin/admin.logic.test.js`.
The normal production build does not include the separate preview entry. Check
it separately with Vite's programmatic build and `rollupOptions.input` pointing
to `src/components/admin/preview.html`.
