# OJEE Tracker: Technical Project Overview

This documentation provides an exhaustive technical analysis of the OJEE Tracker project. It is designed to empower LLM-based agents with the full context required for complex coding tasks, including feature implementation, bug fixing, and UI/UX enhancements.

To get entire essence of this codebase you have following files at your disposal:
1. OVERVIEW.md
2. CHANGELOG.md
3. .ai_workflow/state-map.md
4. .ai_workflow/dependency-map.md
5. .ai_workflow/architecture-decisions.md
6. .ai_workflow/DESIGN_SYSTEM.md
7. .ai_workflow/src/ (this is virtual directory created by running the prompt guideForSummaries.md)

**Last Updated:** 2026-03-01

---

## 1. Project Essence & Objective

**OJEE Tracker** is a high-performance, offline-first progress tracking application specifically optimized for academic preparation. It solves the problem of tracking granular completion across multiple subjects (Physics, Chemistry, Maths) and diverse study materials (NCERT, PyQs, Modules, etc.).

### Key Philosophies:
- **Visual-First Progress**: Immediate feedback through rings, bars, and confetti.
- **Extreme Flexibility**: Users can modify the syllabus, add/remove resource columns, and reorder content.
- **Deep Persistence**: Leveraging `localStorage` for a zero-server, instant-load experience.
- **Shareable Achievement**: The **Personalized Progress Card** feature allows users to generate and download (PNG) a card summarizing their achievements, featuring dynamic avatars (via `boring-avatars`) and customizable stats.
- **Integrated Toolset**: Combines syllabus tracking with a daily/weekly planner (featuring Shift+Drag duplication) and a high-performance **Apple Calendar-style Monthly Planner** with color-coded task pill bars.
- **Multimodal Study Clock**: Supports Stopwatch, Countdown, Pomodoro, and Custom Interval modes with persistent recovery.
- **Hybrid Time Tracking**: Supports both real-time timestamp-based tracking and manual log entry for offline study sessions.
- **Unified Actions**: Deep integration between the Study Clock and Planner, allowing users to "Mark Complete" a task directly from the timer interface.
- **Personalized Appearance**: High degree of UI customization, including custom background wallpapers, adjustable background dimming, and advanced glassmorphism controls.
- **Advanced Glassmorphism**: Implementation of a **Refractive Index** control that dynamically adjusts saturation, brightness, and prismatic hue-rotation for a high-fidelity "refracted glass" look.
- **Intelligent Theming**: Automatic accent color extraction from custom wallpapers using `node-vibrant` for a cohesive look.
- **Multi-Exam Countdown**: Supports tracking multiple competitive exam dates simultaneously with a primary focus and a persistent, space-efficient cyclical secondary counter.
- **Layered Styling Architecture**: Uses modern CSS Layers for strict cascade control.

---

## 2. Technical Architecture

### Core Stack:
- **Framework**: React 18 with TypeScript.
- **State Management**: **React Context API** (Modular architecture).
- **Routing**: React Router (react-router-dom) v7.
- **Build System**: Vite (optimized for fast HMR and PWA builds).
- **Package Manager**: pnpm (for efficient dependency management).
- **Styling**: **CSS Layers (@layer)** for explicit cascade priority.
- **Versioning**: Automated via `commit-and-tag-version`.

### Project Structure:
```text
/src
  /core           # Application setup (Providers, Hooks, Routing)
    /context      # React Context Providers for global state
    /hooks        # Business logic hooks (shortcuts, auto-shift, quotes)
    App.tsx       # Modular application entry point
    AppRoutes.tsx # Centralized Route definitions
  /features       # Domain-driven features (Dashboard, Planner, StudyClock, Subjects)
  /shared         # Reusable code (UI components, generic hooks, utils, types)
  /styles         # Centralized Design System using CSS Layers
    index.css     # Entry point with @layer declarations
    base.css      # Layer: base (Global elements)
    layout.css    # Layer: layout (App structure)
    /layers       # Core Layer definitions (_reset.css, _tokens.css)
    /components   # Layer: components (ui.css, modals.css)
    /features     # Layer: features (Domain specific)
  main.tsx        # Entry point
```

---

## 3. State Management (Context API)

The application uses a **Layered Provider Pattern** to handle global state and side effects, ensuring separation of concerns and optimized re-rendering.

### 3.1 ThemeContext
- **Responsibilities**: Manages `theme`, `accentColor`, `backgroundUrl`, `dimLevel`, and glassmorphism settings.
- **Logic**: Automatically updates `document.documentElement` CSS variables and PWA meta tags when visual settings change.

### 3.2 SubjectDataContext
- **Responsibilities**: Manages the syllabus structure for Physics, Chemistry, and Maths.
- **Logic**: Handles initial CSV parsing, custom column management, material exclusion, and material/chapter ordering logic.

### 3.3 UserProgressContext
- **Responsibilities**: Manages completion progress, planner tasks, study sessions, and mock scores.
- **Logic**: Coordinates complex interactions, such as syncing "Mark Complete" actions between the Planner and Subject syllabus.

---

## 4. Styling Strategy

The project utilizes a **CSS Layered Architecture** to solve specificity battles and styling overrides. Styles are organized into a strict hierarchy: `reset`, `tokens`, `base`, `layout`, `components`, `features`, `utilities`.

### 4.1 Glassmorphism Engine
Glass effects are centralized in `src/styles/components/glass.css` using the `.glass-panel` utility. This ensures that the **Refractive Index** and **Blur Intensity** settings from `ThemeContext` are applied consistently across all dashboard cards, modals, and tables.

---

## 5. Release Management
...
---

## 6. Refactoring History

### UI Consistency & Custom Background Fix (v0.0.21)
- **Problem**: Custom loaded backgrounds were invisible due to `html` base stacking contexts eclipsing the z-axis. Unmatched panel styling broke `planner-task` and dashboard cohesiveness using `@extend` which is strictly invalid.
- **Solution**:
    - Extracted pseudo image/dim overlays from `html::before` to `body.has-custom-bg::before` in `base.css`.
    - Sanitized standard CSS away from invalid `@extend` mixins (`dashboard.css`).
    - Standardized `planner-task` background token references.

### Strict Token-Based Glassmorphism & Light Mode Fix (v0.0.20)
- **Problem**: Glassmorphism leaked into Light Mode due to global `backdrop-filter` declarations and escalating `!important` tags scaling across multiple modules.
- **Solution**: 
    - Isolated all glass properties (`--glass-*`) exclusively within `[data-theme="dark"]`.
    - Implemented `var(--panel-blur)` as the definitive depth mapping token, which evaluates to `none` in Light Mode and `blur()` in Dark Mode.
    - Stripped hardcoded `style={{...}}` layout objects from `InputModal.tsx` and `PageLoader.tsx`, cleanly moving them to `@layer components`.

### TaskModal Architectural Cleanup (v0.0.19)
- **Problem**: `TaskModal.tsx` was a 400-line monolith with fragmented state (13+ `useState` calls) and fragile time-syncing logic.
- **Solution**: 
    - Extracted form logic into a custom `useTaskForm` hook.
    - Decomposed UI into `ChapterTaskFields` and `CustomTaskFields`.
    - Created a reusable `TimePicker` component in `shared/ui`.
- **Optimization**: Centralized time-parsing utilities in `shared/utils/date.ts`, eliminating `useEffect`-based state syncing and reducing "one-off" errors in time formatting.

### Styling Centralization (v0.0.19)
- **Problem**: Glassmorphism properties were duplicated across 10+ CSS files, making global style adjustments difficult.
- **Solution**: Created a dedicated `glass.css` within the `components` layer.
- **Implementation**: Refactored `AgendaCard`, `TaskLog`, `TimerCard`, and `ChapterTable` to consume unified `.glass-panel` properties.

### Planner Performance Overhaul (v0.0.18)
- **Problem**: The `Planner.tsx` component was a 400+ line monolith with a critical performance issue: it re-filtered the entire `tasks` array on every render for every day shown in the calendar, causing significant lag.
- **Solution**: Decomposed the component into `WeeklyView`, `MonthlyView`, `DayColumn`, and a memoized `MonthCell`.
- **Optimization**: Created a `usePlannerData` hook to pre-process and group all tasks by date *once*. This changes data lookups from a slow O(N) filter to an instantaneous O(1) map lookup, eliminating the performance bottleneck.

### Dashboard De-bloat (v0.0.17)
- **Problem**: The analytics dashboard was a monolithic "God Component" causing performance bottlenecks and maintenance issues.
- **Solution**: Decomposed into `StudyTimePanel`, `MockScoresPanel`, and `AddMockModal`.
- **Optimization**: Extracted data aggregation logic into memoized custom hooks (`useStudyTimeAnalytics`, `useMockScoresAnalytics`) to isolate re-renders and improve UI responsiveness.

### Multi-Exam Countdown Panel (v0.0.23)
- **Problem**: Users preparring for competitive exams needed to track multiple related dates concurrently (e.g. Session 1, Session 2, Advanced) rather than a single target date.
- **Solution**: 
-     - Migrated `UserProgressContext` from `examDate: string` to `examDates: ExamEntry[]`.
-     - Implemented an auto-migration hook to preserve legacy single-date data.
-     - Created the specialized `ExamCountdownModal` for interactive exam management.
-     - Redesigned the Dashboard countdown card to show a primary focus and a secondary list of upcoming exams.

### SubjectPage Performance & Component Decomposition (v0.0.22)
- **Problem**: `SubjectPage.tsx` was a 448-line monolith. Lack of memoization caused all ~30+ chapter rows to re-render on every interaction (checkbox click, filter change), leading to noticeable UI lag.
- **Solution**: 
    - Extracted generic list reordering logic into `useReorderDrag` hook.
    - Extracted memoized sorting/filtering into `useChapterSort` hook.
    - Decomposed UI into `SubjectHeader` and `PriorityFilterDropdown`.
    - Wrapped `ChapterRow` in `React.memo` and stabilized callbacks with `useCallback`.
- **Optimization**: Component size reduced from 448 to ~260 lines. UI interactions are now instantaneous due to prevented re-render cascades.
+
+### Cyclical Secondary Exam Interface (v0.0.25)
+- **Problem**: Displaying multiple secondary exams in a list consumed too much vertical space on the Dashboard and introduced cluttered scrollbars.
+- **Solution**: Replaced the list with a single cyclical button that loops through exams chronologically on click. State is persisted via `useLocalStorage` to ensure the selection survives reloads.
+
### Study Clock Multimodal Feedback & Persistence (v0.0.25)
- **Problem**: Context loss during phase changes or refreshes. Lack of differentiated auditory feedback for specific user actions (Pause/Save). Large confetti bursts obscured the UI.
- **Solution**:
    - **Persistence**: Task selection state is now saved to `localStorage`, ensuring continuity across the entire Pomodoro lifecycle.
    - **Multimodal Cues**: 
        - **Audio**: Introduced distinct synthesized signatures for Start, Pause, and Completion.
        - **Notifications**: Integrated system-level alerts for background phase transitions.
    - **Visual Polish**: implemented targeted, accent-colored confetti bursts that spawn from the cursor coordinates on manual study task completion.

### Study Clock Overhaul & Timer Engine Extraction (v0.0.24)
- **Problem**: The Study Clock was using a fragile `setInterval` state-syncing approach, leading to desync issues. The UI was cluttered with a radial SVG that didn't scale well, and preset management was inconsistent.
- **Solution**: 
    - Extracted core timing logic into a headless `useTimerEngine.ts` hook using high-precision timestamp math.
    - Reverted UI to a large, clean horizontal textual display for better readability and scaling.
    - Implemented a "Click for Fullscreen" feature with specialized keyboard shortcuts (F/Space/Escape).
    - Standardized "Finish" button icons to green `CheckCircle2` across all modes for positive reinforcement.
    - Integrated `triggerConfetti()` and a synthesized audio bell on session completion.
    - Optimized internal state: removed "Save Preset" for Stopwatch mode and added a collapsible task selector to reclaim vertical estate during active sessions.

### Planner-to-Clock Direct Linking (v0.0.22)
- **Problem**: Users had to manually select tasks in the Study Clock even if they were already looking at them in the Planner.
- **Solution**: 
    - Made Planner task titles clickable (for non-completed tasks).
    - Implemented URL-based task selection in `StudyClock` using `useSearchParams`.
    - Study Clock now auto-populates all task metadata (Subject, Chapter, Material) on mount if a `taskId` is present.

---

*This document serves as the ground truth for agents. When in doubt, defer to the behaviors defined here.*
