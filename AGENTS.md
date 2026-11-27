# AGENTS.md — ojeet-tracker

Offline-first JEE & NEET syllabus tracker & study planner. Vite + React 18.3.1 + TypeScript.

## Hard Rules (never violate)
- **Package manager**: pnpm only — `pnpm install`, `pnpm run dev`, `pnpm run build`, `pnpm test`, `pnpm exec`. Never `npm`/`yarn`/`bun`.
- **Styling**: Vanilla CSS, no Tailwind. Every color/spacing/font MUST use a token (`var(--color-...)`) — never hardcode. Check `DESIGN_SYSTEM.md` before writing any CSS.
- **Mobile-first UI**: Always design, structure, and style UI components with a mobile-first approach. Every single UI element, layout, and page implemented must be fully responsive, visually polished, and highly usable on both mobile (narrow viewports) and desktop (wide viewports). No feature or UI can be shipped if it is not mobile-friendly.
- **Branches**: Cut from the current branch if working on major changes. Prefix with `feature/`, `fix/`, `docs/`, `style/`, `refactor/`, or `chore/`.
- **Commits**: Conventional Commits format — `type(scope): subject`.
- **Committing User Changes**: When asked to commit uncommitted work, review and split the work into logical, sequential commits using Conventional Commits.
- **Testing & Building**: Do not autonomously run `pnpm test` or `pnpm build` before committing. The user prefers to run test suites locally unless explicitly requested.
- **Before any PR**: `pnpm run lint`, `pnpm run build`,  must all pass locally.
- **Never run full test suite. Only run tests related to what is being worked on.**

## Tech Stack
- Vite + React 18.3.1 + TypeScript
- State/persistence: React Context + custom `useLocalStorage` hooks
- Charts: `chart.js` · Icons: `lucide-react` · Celebrations: `canvas-confetti`
- Serverless & Analytics: Vercel edge functions (`api/`), `@vercel/analytics`, `@vercel/speed-insights`

## Directory Structure
- `api/` — Vercel serverless edge functions
- `public/data/` — JEE & NEET syllabus JSON (`physics.json`, `chemistry.json`, `maths.json`, `biology.json`)
- `src/core/` — Context providers (Auth, Sync, Theme, Settings, Subject Data, User Progress) + routing
- `src/features/` — feature modules: `subjects`, `dashboard`, `planner`, `study-clock`
- `src/shared/` — types, shared components, hooks, utilities, subject/mode configs
- `src/styles/` — CSS organized by cascade layer (below)

## CSS Architecture
Full spec lives in `DESIGN_SYSTEM.md` — read it before any styling work.

Cascade layers, lowest → highest priority:
`reset` → `tokens` → `base` → `layout` → `components` → `features` → `utilities`

- **Mobile-First Responsiveness**: Base styles must target mobile layouts first. Build layout complexity upwards for desktop screens using min-width media queries (e.g., `@media (min-width: 48rem)`). Avoid max-width queries for desktop-only overrides unless absolutely necessary. Every UI implemented must work and adapt flawlessly on both mobile and desktop screens.
- Glassmorphic panels (`html[data-theme='dark-glass']`): desktop only (≥48rem). Solid-color fallback below 48rem and in `dark-solid`.
- Subject colors: use `.text-physics` / `.text-chemistry` / `.text-maths` utility classes, never hardcoded hex values.



## Git & GitHub
- PRs: push to remote, base `develop`, use `.github/pull_request_template.md`
- Versioning (semantic-release): `feat` → minor, `fix` → patch, `!` or `BREAKING CHANGE` → major

## Design Context (from PRODUCT.md)
**Register:** Product (App UI, dashboards, planner tools)
**Brand Personality:** High-focus, premium, and precise (incorporating glassmorphism and clean typography)
**Anti-references:** Generic SaaS templates, cluttered card layouts, and distracting animations.
**Key Principles:** Focus First, Premium Precision, Show Don't Tell, Adaptive Context.
