# Project IronClad — app agent rules

Updated 21 October 2026, Asia/Manila, against the approved frontend and current repository structure.

## Scope and ownership

These instructions apply to work under `apps/`. Read [Team-Handoff.md](../Team-Handoff.md) for the current team workflow and [.github/CODEOWNERS](../.github/CODEOWNERS) for the declared ownership areas. Follow the user's latest authorized scope; do not start another development phase simply because it is described here.

- Frontend: `apps/web/Frontend`. Paths beginning with `src/` below are relative to this frontend directory.
- Backend: `apps/server`, the single backend location. It currently contains only `.gitkeep`; no backend runtime or start/test command is configured there yet. Do not create a parallel backend under `apps/web`.
- Database: `packages/database`, currently a `.gitkeep` placeholder for database/schema/migration work. It is outside this file's `apps/` instruction scope; check any applicable instructions before editing it.
- `apps/web/src` is not the active frontend source root. Do not move/delete unrelated paths as a side effect of another task.

## Existing stack and change scope

- Keep the existing React, Vite, Tailwind and npm workspace setup. Do not change dependencies, manifests/lockfiles, Vite configuration or the Tailwind setup unless the user explicitly requests or approves that change. Ask before adding a package.
- Reuse existing components, hooks, services and context before introducing replacements. Keep components small, explain non-obvious behavior and keep code ESLint-clean.
- Edit only files relevant to the authorized task. Services, hooks, context, features and app documentation may be changed when that task requires them; the old pages/components/data-only restriction no longer applies.
- Preserve existing local edits, untracked files, browser records and completed workflows. Do not reset/clean unrelated work or automatically stage, commit, push, merge or deploy.

## Frontend structure and runtime

- `src/pages/{admin,auth,council,public,student}/`: route-level pages.
- `src/components/{common,auth,admin,council,public,student}/`: shared and role-specific UI.
- `src/features/student-booking/`: existing booking layout, logic, styles and fixtures; shared booking components also exist under `src/components/common/`.
- `src/services/`, `src/hooks/`, `src/context/`: integration boundaries, read/state hooks and shared authentication context.
- `src/data/`: the explicitly requested frontend workflow store, fixed test accounts and supporting logic/tests. Preserve this approved local system.
- `src/assets/`: existing branding and UI assets. `src/main.jsx` mounts `App` inside the existing BrowserRouter.

With no defined inputs, `App` selects `components/common/FrontendSystem.jsx` and the browser-local workflow store. Defined App inputs select the separate supplied-session/service composition. Preserve both boundaries until an authorized integration task deliberately reconciles them. Do not assume the older supplied-input routes are the current default UI; use the team guide and actual route definitions.

## Data and integration rules

- The user expressly requested the local frontend system and 13 fixed test accounts. Do not delete `src/data`, remove those accounts or disable local workflows based on the superseded blanket no-mock rule. The approved frontend does not become obsolete merely because the `apps/server` directory exists.
- In the local system, derive records, counts, badges and schedules from the existing store/account state. Mutations must save successfully before reporting success; preserve validation, duplicate/conflict handling and error recovery. Do not insert unrelated records, typed display counters or no-op success callbacks.
- Live integrations use the existing service/API boundaries and read hooks. The fetch wrapper is `src/services/api.js`; its base URL comes from `import.meta.env.VITE_API_URL`. Do not invent endpoints, providers or production records. Preserve `{ data, loading, error, refetch }` hook conventions and applicable loading/error-with-Retry/empty/unavailable states.
- Read the current user through the shared `src/context/AuthContext.jsx`/auth hooks and existing local membership/profile composition. Signed-out or unavailable identity needs a truthful neutral state, not a hardcoded signed-in user.
- Actions may navigate, open/close UI or invoke the supported workflow operation. A confirmed result must come from a successful local save or an actual supplied service response; preserve drafts and distinguish failed/unconfirmed writes from failed refreshes. Do not present fabricated optimistic success.
- Real authentication, email ownership, credential changes, sessions, role grants, server authorization, WebSockets and persisted concurrent workflows remain backend acceptance work. Client role gates and frontend verification receipts are not server enforcement. Confirm authoritative reviewer permissions during integration; the current local Council/Admin review behavior must not silently become production policy.

## Design, layout and accessibility

- Preserve the approved shared News Feed, Booking, Archive, Profile, My Activity and role-management flows described in the team guide. Reuse the shared shell/controls rather than adding alternate page designs or duplicate navigation.
- Font: Poppins. Reuse existing theme tokens and assets; do not hardcode hex colors in components. The current Tailwind v4 setup loads `tailwind.config.js` through `@config` in `src/index.css`; do not replace that arrangement merely because v4 also supports `@theme`.
- Existing radii/shadows remain defined in that config: chips 4px, controls 8px, panels 12px, cards 16px and pill rounding. Preserve the existing green palette, spacing and visual hierarchy.
- Shared `PageLayout` is fluid and uses available width with responsive padding and a fixed-navbar offset. Preserve its current behavior and Booking's dedicated full-width layout; do not reintroduce the old blanket 1280px cap or fixed `88px 32px 24px` padding. A token or component-specific limit is not a global layout requirement.
- Use flexible layouts with no document horizontal overflow; wide tables may scroll within their own regions. Keep dialogs, dropdowns and calendar popups contained on narrow screens.
- Use semantic landmarks/labels, aria-labels for icon-only controls, visible keyboard focus and the existing 44px minimum interactive targets. Preserve focus trapping/return, pointer/arrow selection and nested Escape behavior: an open popup closes before its enclosing dialog.
- Retain readable text/placeholder contrast; reuse the corrected `textSecondary` placeholder styling rather than restoring the failing muted placeholder treatment.
- Preserve the chosen desktop login-panel slide, including its explicitly approved reduced-motion behavior, unless the user requests a change. Do not restore removed design-review or spoken-screen-reader gates as new completion requirements.

## Verification commands

Run these frontend commands from the repository root:

```powershell
npm run dev --workspace=apps/web/Frontend
npm run lint --workspace=apps/web/Frontend
npm run build --workspace=apps/web/Frontend
```

Existing frontend logic tests can be discovered and run from the repository root with PowerShell and ripgrep:

```powershell
$testFiles = @(rg --files apps/web/Frontend/src -g '*.test.js')
node --test --test-reporter=spec @testFiles
```

Alternatively, run `npm run dev`, `npm run lint` and `npm run build` inside `apps/web/Frontend`, not `apps/web`. For code changes, run checks appropriate to the affected behavior and complete required lint/build validation. For documentation-only work, verify paths, links and consistency without claiming fresh application/browser acceptance. Add backend commands only when an authorized backend implementation actually supplies them.
