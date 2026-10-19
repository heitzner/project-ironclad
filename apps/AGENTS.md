# Project IronClad – Agent Rules

## Stack
Use the project's existing setup. Do NOT change, upgrade, or downgrade dependencies,
vite.config.js, package.json, or the Tailwind setup. If a new package seems needed,
stop and ask first. Design tokens go in the existing Tailwind config (v3: tailwind.config.js, v4: @theme in index.css).

## Structure (apps/web)
- src/pages/{admin,auth,council,public,student}/ – route-level pages only
- src/components/common/ – Navbar, Footer, SearchBar, PageHeader, ProgressBar
- src/components/{admin,council,student}/ – role-specific components
- src/data/ – mock data until apps/server exists

## Design system
Font: Poppins. Never hardcode hex values in components; use theme tokens.

Colors:
- navbar #145C41, navActive #04855A, navMuted #73DAA8, ring #93F6CA
- pageBg #F4FAF7, cardBg #E5F9EF, footerBg #A3DDC0
- primary #1C8F63, dark #006A46, deep #0E3B29, soft #5CBE96
- textPrimary #161717, textSecondary #3E4942, textMuted #6E7A72
- surfaceGray #E9E8E7, selectBg #F5F3F3, track #E3E2E2

Radii: 4px chips, 8px buttons/inputs, 12px panels, 16px cards, full pills.
Shadows: card `0 1px 2px rgba(0,0,0,.05)`, nav `0 2px 10px rgba(0,0,0,.12)`.
Layout: designed at 1280px, fluid, max-w 1280px centered. Main padding 88px 32px 24px (fixed 64px navbar).

## Rules
- Reuse existing components before creating new ones.
- Match design specs exactly (padding, gap, font size, weight, letter-spacing). Use Tailwind arbitrary values like text-[11px] when needed.
- No fixed pixel widths on content; use flex/grid.
- Accessible: semantic tags, aria-label on icon-only buttons, focus-visible rings.
- Keep components small, commented, and ESLint-clean.
- Don't modify files outside the current task.
- Only create or edit files in src/pages, src/components, and src/data.
## Commands (run from apps/web)
- npm run dev – start dev server
- npm run lint – lint
- npm run build – verify the build

## Data rules (strict)
- NO mock data, seed arrays, fake counters, or hardcoded records anywhere. Delete src/data usage.
- All data comes through src/services/* (fetch wrapper in services/api.js). Base URL from import.meta.env.VITE_API_URL. Never hardcode a URL.
- Pages use hooks (src/hooks) that return { data, loading, error, refetch }.
- Every data-driven view needs loading, error (with Retry), and empty states.
- Counts, badges, categories, names, and schedules are derived from API responses, never typed in.
- Buttons either navigate (react-router) or open a modal. Actions that change data call a service function, then show the real success or error. No optimistic fake updates.
- The current user comes from src/context/AuthContext.jsx. If no user is loaded, show a neutral signed-out state, never a fake name.