# Project Overview & Context: ojee-tracker

This document captures key learnings about the project architecture and our current active objectives to help any AI agent ramp up immediately.

---

## 1. Project Overview

`ojee-tracker` is an offline-first JEE/OJEE syllabus tracker and study planner designed for students. It enables tracking syllabus completion, planning daily study tasks, timing study sessions, and recording mock exam scores.

### Tech Stack
- **Framework & Core**: Vite + React (v18.3.1) + TypeScript.
- **State & Persistence**: React Context APIs coupled with Custom Local Storage hooks (`useLocalStorage`) for robust offline-first persistence.
- **Database / Sync**: Supabase integration (`@supabase/supabase-js`) for cloud synchronization when logged in.
- **Styling**: Structured Vanilla CSS organized by features and layers (no utility-first frameworks like Tailwind).
- **Libraries**: `chart.js` (performance analytics), `lucide-react` (icons), `canvas-confetti` (completion celebrations).

### Directory Structure
- [public/data/](file:///home/naman/Documents/ojee-tracker/public/data/): Holds the JEE 2026 syllabus JSON files (`physics.json`, `chemistry.json`, `maths.json`).
- [src/core/](file:///home/naman/Documents/ojee-tracker/src/core/): Context providers (Auth, Sync, Theme, Subject Data, User Progress) and routing.
- [src/features/](file:///home/naman/Documents/ojee-tracker/src/features/): Main feature modules:
  - `subjects`: Syllabus tables, chapters list, reordering, and the details workspace panel.
  - `dashboard`: Progress rings, today's agenda tasks, countdown timer, and subject cards.
  - `planner`: Study schedule, calendar, task lists, and auto-shifting overdue tasks.
  - `study-clock`: Stopwatch/countdown timer for tracking active study duration.
- [src/shared/](file:///home/naman/Documents/ojee-tracker/src/shared/): Types, shared UI components, custom hooks (`useLocalStorage`, `useProgress`), and utilities.
- [src/styles/](file:///home/naman/Documents/ojee-tracker/src/styles/): CSS code divided into features (e.g. `subjects.css`, `dashboard.css`).

---

## 2. Recent Implementation: Subtopics Tracking & Chapter Workspace (V2)

The subtopics tracking and Chapter Workspace (V2) features have been fully implemented and integrated. 

### Key Implementations & Architecture
1. **Collapsible Row-Based Subtopics**: Replaced nested card clutter in [ChapterDetailDrawer.tsx](file:///home/naman/Documents/ojee-tracker/src/features/subjects/components/ChapterDetailDrawer.tsx) with clean, collapsible subtopic rows.
   - **Collapsed State**: Shows the subtopic name, a completion fraction, and horizontal progress dots mapping to NCERT, PYQs, and Modules.
   - **Expanded State**: Expands inline to reveal material checklist selectors, a compact question stepper, revision date/count selectors, and reset buttons.
   - **Performance & Animations**: Optimized using local component states, semantic HTML layout, and explicit CSS transition properties (avoiding the banned `transition: all`).
2. **Dynamic Progress & Question Totals**:
   - Chapter progress percentages are derived dynamically from completed subtopic study materials.
   - Total questions attempted for a chapter are calculated as the sum of all subtopic question counts.
3. **Indeterminate State Main Checkboxes**: The syllabus table checkboxes automatically reflect completed, incomplete, or partially completed (indeterminate) subtopic states.
4. **Revision Trackers & Stale Badges**: Revision counters and dates are trackable. Warning badges are automatically shown for subtopics not revised in more than 30 days. Includes unified `.icon-btn-reset` action buttons for clearing.
5. **Design System & Styling Standards**: CSS rules in [subjects.css](file:///home/naman/Documents/ojee-tracker/src/styles/features/subjects.css) strictly utilize core design tokens (e.g., `var(--bg-tertiary)`, `var(--border)`, `var(--text-primary)`) rather than custom/undefined variables. Control heights (e.g., mark today, reset, stepper buttons) are standardized to 24px (`var(--space-6)`) or 28px (`1.75rem` for date buttons) for pixel-perfect alignment.

