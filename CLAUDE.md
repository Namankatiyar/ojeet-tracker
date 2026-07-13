# AGENTS.md — ojee-tracker

Offline-first JEE syllabus tracker & study planner. Vite + React 18.3.1 + TypeScript.

## Hard Rules (never violate)
- **Package manager**: Bun only — `bun install`, `bun run dev`, `bun run build`, `bun run test --run`, `bunx`. Never `npm`/`yarn`/`pnpm`.
- **Styling**: Vanilla CSS, no Tailwind. Every color/spacing/font MUST use a token (`var(--color-...)`) — never hardcode. Check `DESIGN_SYSTEM.md` before writing any CSS.
- **Branches**: cut from `develop`, never `main`. Prefix with `feature/`, `fix/`, `docs/`, `style/`, `refactor/`, or `chore/`.
- **Commits**: Conventional Commits format — `type(scope): subject`.
- **Before any PR**: `bun run lint`, `bun run build`, `bun test` must all pass locally.

## Tech Stack
- Vite + React 18.3.1 + TypeScript
- State/persistence: React Context + custom `useLocalStorage` hooks
- Sync: Supabase (`@supabase/supabase-js`) OLD -> Now migrating to Firebase
- Charts: `chart.js` · Icons: `lucide-react` · Celebrations: `canvas-confetti`

## Directory Structure
- `public/data/` — JEE 2026 syllabus JSON (`physics.json`, `chemistry.json`, `maths.json`)
- `src/core/` — Context providers (Auth, Sync, Theme, Subject Data, User Progress) + routing
- `src/features/` — feature modules: `subjects`, `dashboard`, `planner`, `study-clock`
- `src/shared/` — types, shared components, hooks, utilities
- `src/styles/` — CSS organized by cascade layer (below)

## CSS Architecture
Full spec lives in `DESIGN_SYSTEM.md` — read it before any styling work.

Cascade layers, lowest → highest priority:
`reset` → `tokens` → `base` → `layout` → `components` → `features` → `utilities`

- Glassmorphic panels (`html[data-theme='dark-glass']`): desktop only (≥48rem). Solid-color fallback below 48rem and in `dark-solid`.
- Subject colors: use `.text-physics` / `.text-chemistry` / `.text-maths` utility classes, never hardcoded hex values.

## Skill Workflow
For any non-trivial task, invoke the matching skill(s) below *before* writing code — don't skip straight to implementation.

| Situation | Skill(s), in order |
|---|---|
| New feature | `brainstorming` → `writing-plans` → `executing-plans` |
| Confusing bug | `systematic-debugging` |
| Correctness-critical code | `test-driven-development` |
| Ready to ship | `verification-before-completion` |
| Multiple parallel tasks | `subagent-driven-development` |
| Acting on review feedback | `receiving-code-review` |
| Before requesting merge | `requesting-code-review` |
| Merging / branch cleanup | `finishing-a-development-branch` |
| Any UI or styling work | `ojee-tracker-design` + `frontend-design` |

**Firebase work** (only if touching Firebase): CLI is always `bunx -y firebase-tools@latest`.
- `firebase-basics` — setup/config
- `firebase-auth-basics` — auth rules, sign-in
- `firebase-firestore` — queries, security rules, indexes (activate unconditionally if Firestore is touched)
- `firebase-ai-logic-basics` — Gemini API, multimodal, structured output

## Git & GitHub
- PRs: push to remote, base `develop`, use `.github/pull_request_template.md`
- Versioning (semantic-release): `feat` → minor, `fix` → patch, `!` or `BREAKING CHANGE` → major
- Full instructions: `git-github-workflow` skill

## Design Context (from PRODUCT.md)
**Register:** Product (App UI, dashboards, planner tools)
**Brand Personality:** High-focus, premium, and precise (incorporating glassmorphism and clean typography)
**Anti-references:** Generic SaaS templates, cluttered card layouts, and distracting animations.
**Key Principles:** Focus First, Premium Precision, Show Don't Tell, Adaptive Context.
