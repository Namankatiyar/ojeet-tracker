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

## 2. Active Focus: Subtopics Tracking & Chapter Workspace (V2)

We are extending chapter-level syllabus tracking into a detailed **Chapter Workspace** using subtopics loaded from the syllabus JSON files.

### Key Objectives
1. **Status Column Refactor**: Rename the `Priority` column in the subject chapter table to `Status`. Display a 5-block segmented progress bar (20% increments) side-by-side with the priority selector dropdown.
2. **Subtopic Progress States**: Enable tracking subtopic completion across different study materials (NCERT, PYQs, Modules) and attempted question counts.
3. **Derived Metrics**:
   - **Progress**: Dynamic computation of chapter progress percentages based on completed subtopic tasks.
   - **Questions**: Auto-sum attempted questions across subtopics to display chapter-level totals.
4. **Revision Controls**: Add reset buttons in steppers/dates to clear accidental markings. Highlight subtopics not revised in over 30 days.
5. **Indeterminate Checkboxes**: The main table checkboxes will reflect fully completed, incomplete, or partially completed (indeterminate) states of subtopic materials.
