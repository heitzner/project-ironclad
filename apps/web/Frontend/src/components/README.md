# Frontend file guide

## Where to start

| Change | File or folder |
| --- | --- |
| Login, registration, reset, password visibility, modal sizing/animation | `auth/LogIn.jsx` |
| Test accounts, registration validation, Remember me | `auth/test-auth.js` |
| Shared top navigation | `common/Navbar.jsx` |
| Shared page wrapper and footer | `common/PageLayout.jsx`, `common/Footer.jsx` |
| Admin sidebar and mobile navigation | `admin/AdminSidebar.jsx` |
| Admin page layout and access state | `admin/AdminShell.jsx` |
| Admin clock and workspace badge | `admin/AdminWorkspaceStatus.jsx` |
| Admin tables, dialogs, fields, buttons | `admin/AdminTable.jsx`, `admin/AdminDialog.jsx`, `admin/admin.css` |
| Admin validation and permissions | `admin/admin.logic.js` |
| Select the current admin page | `../pages/admin/AdminWorkspace.jsx` |
| Dashboard, booking, event, user management screens | `../pages/admin/` |
| Student and council signed-in landing view | `../pages/student/NewsFeed.jsx` |
| Student booking components and styles | `../features/student-booking/` |

## Login file sections

`auth/LogIn.jsx` intentionally keeps the component and its styles together.
Search by function or constant name:

- `LOGIN_STYLES`: modal width/height, panel radius, sliding animation, responsive layout.
- `FIELD_CLASS`, `BUTTON_CLASS`, `TOGGLE_CLASS`: shared control styling.
- `PasswordField`: show/hide password control.
- `RegistrationFields`: student name, campus email, course, year, section.
- `LoginForm`: sign-in/sign-up fields, Remember me, validation messages.
- `WelcomePanels`: sliding green welcome panels.
- `AccountFeedback`: account-created and reset screens.
- `LogIn`: dialog lifecycle, focus, submit handlers, view state.

## Admin page names

- `AdminDashboard.jsx`: facility totals and booking requests.
- `BookingManagement.jsx`: rooms, filters, schedules, booking decisions.
- `EventManagement.jsx`: event list and event dialogs.
- `UserManagement.jsx`: council role management.

Admin pages share `AdminShell`; change the sidebar once in `AdminSidebar`.
The standalone design preview remains in `admin/preview.html`.

## Test authentication

The explicitly requested hardcoded accounts and browser storage are isolated in
`auth/test-auth.js`. This is a frontend demonstration, not server authentication.
Remember me persists only the demo user profile; entered passwords are not saved.
New registration records last for the current tab. Reset email delivery is not connected.
Live admin records remain disconnected until supplied by a real service.

## Verification

From `apps/web/Frontend`:

```text
npm run build
npm run lint
node --test src/components/admin/admin.logic.test.js src/features/student-booking/booking.logic.test.js
```

No new dependencies or build configuration are required by this organization.
