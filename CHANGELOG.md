# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.0.20] - 2026-02-26 20:30

### AI Maintenance Run

### Architectural Changes
- **Strict Token-Based Glassmorphism**: Remapped all hardcoded `backdrop-filter` properties to a dynamic `var(--panel-blur)` token. Enforced complete opacity in Light Mode by isolating glass tokens (`--glass-*`) exclusively inside the `[data-theme="dark"]` scope.
- **Specificity Escalation Cleanup**: Stripped widespread `!important` declarations from CSS overlays (e.g., `planner.css`, Modals).

### Feature-Level Changes
- **Sanitized React Inline Styles**: Removed layout bypassing inline objects from `InputModal.tsx` and `PageLoader.tsx`, mapping them definitively to `@layer components`.
- **Global Blur Standardization**: Synchronized modal and dropdown depths to match the core system variable index `var(--glass-blur)`.

### Suggested ADR Entries
- ADR-008: Strict Token-Based Glassmorphism and Semantic Theming

## [0.0.19](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.18...v0.0.19) (2026-02-23)

### Performance & Refactoring

*   **TaskModal Architectural Cleanup**:
    *   **Decomposition**: Split the monolithic `TaskModal.tsx` into focused sub-components (`ChapterTaskFields`, `CustomTaskFields`) and extracted form state into a custom `useTaskForm` hook.
    *   **Reusable UI**: Created a new `TimePicker` component in `shared/ui` to standardize time selection across the app.
    *   **Logic Extraction**: Moved complex time-parsing and conversion logic (12h/24h) to `shared/utils/date.ts`.
    *   **Type Safety**: Hardened the component with strict TypeScript interfaces, removing legacy `any` types.

### UI & Styling

*   **Global Glassmorphism Centralization**:
    *   **Unified Utilities**: Created `src/styles/components/glass.css` defining `.glass-panel` and `.glass-interactive` utility classes.
    *   **Architecture**: Integrated glass utilities into the `@layer components` hierarchy.
    *   **Consistency**: Refactored the Dashboard (Agenda, Task Log), Study Clock (Timer Card), and Subjects (Chapter Tables) to use the centralized styling engine. This ensures the "Refractive Index" and "Blur Intensity" controls apply perfectly to all glass elements.

## [0.0.18](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.17...v0.0.18) (2026-02-22)

### Performance & Refactoring

*   **Planner Performance Overhaul**:
    *   **Fixed O(N) Lag**: Resolved a major performance bottleneck where the planner would lag with many tasks. It no longer re-filters the entire task list for every day on every render.
    *   **`usePlannerData` Hook**: Created a new hook to pre-process and group tasks by date. This crucial change converts slow O(N) data filtering into instantaneous O(1) map lookups.
    *   **Component Decomposition**: Split the 400+ line `Planner.tsx` monolith into smaller, manageable components: `WeeklyView`, `MonthlyView`, `DayColumn`, and a memoized `MonthCell` for the calendar grid.
    *   **`useDateNavigator` Hook**: Encapsulated all date calculation and navigation logic into a clean, reusable hook.
    *   **Maintainability**: The planner feature is now significantly more modular, performant, and easier to debug.

## [0.0.17](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.16...v0.0.17) (2026-02-22)


### Bug Fixes

* removed the monolithic AnalyticsPanel.tsx causing significant loading time imrpovements. ([78b6e27](https://github.com/Namankatiyar/pcm-tracker/commit/78b6e27a9d22371e8837eb31da49c4401a40f0b5))

## [0.0.17] (2026-02-22)

### Refactoring

*   **Dashboard De-bloat**:
    *   Split the monolithic `AnalyticsPanels.tsx` (440+ lines) into modular components: `StudyTimePanel`, `MockScoresPanel`, and `AddMockModal`.
    *   **Performance**: Isolated chart re-renders. Opening the "Add Mock" modal no longer triggers a re-render of the heavy Study Time charts.
    *   **Logic Extraction**: Moved complex date aggregation and chart data transformation into custom hooks (`useStudyTimeAnalytics`, `useMockScoresAnalytics`).
    *   **Utilities**: Centralized Chart.js configurations in `analyticsUtils.ts`, reducing code duplication by ~80%.
    *   **Theme Integration**: Replaced brittle `MutationObserver` usage with the robust `useTheme` context hook for reliable chart theming.

## [0.0.16](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.7...v0.0.16) (2026-02-22)

## Features 

### Major Architectural Refactor

*   **Decomposition of `App.tsx`**: Successfully refactored the monolithic "God Component" into a modular, maintainable architecture using React Context API and Custom Hooks.
*   **Context Providers**:
    *   **`ThemeContext`**: Centralized all UI customization (Theme, Accent, Glassmorphism, Backgrounds) and dynamic CSS variable updates.
    *   **`SubjectDataContext`**: Isolated CSV ingestion, syllabus structure management, and custom column logic.
    *   **`UserProgressContext`**: Dedicated provider for tracking completion, planner tasks, study sessions, and mock scores.
*   **Custom Hooks Extraction**:
    *   `useGlobalShortcuts`: Handles system-wide keyboard interactions (`Alt+N`).
    *   `useDailyQuote`: Manages daily motivational quote selection and persistence.
    *   `useAutoShiftTasks`: Encapsulates the business logic for rescheduling overdue tasks.
*   **Modular Routing**: Extracted route definitions into a dedicated `AppRoutes.tsx` component.
*   **Type Safety**: Performed a full codebase type check and eliminated unused parameters and dead logic in the core layer.

## [0.0.15] (2026-02-03)


### Features

* avatar and a progress show off card feature fix: refractive index slider ([dda23ec](https://github.com/Namankatiyar/pcm-tracker/commit/dda23ec90e5ce45ddcf93629e6b948f5c92e7c49))

## [0.0.15](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.14...v0.0.15) (2026-02-03)

### Features

* **Personalized Progress Card**: 
    * Integrated `boring-avatars` for dynamic, accent-color-themed user avatars.
    * Added support for custom avatar uploads.
    * Implemented a shareable progress card displaying comprehensive study stats (Total Time, Mock Scores, Subject Progress, and Averages).
    * Added "Download as PNG" functionality using `html2canvas` with high-resolution export.
    * Customizable stat visibility toggles.
* **Enhanced Glassmorphism**: 
    * Upgraded the Refractive Index slider with significantly more dramatic saturation (up to 300%) and brightness (up to 130%) ranges.
    * Introduced subtle hue-rotation logic to simulate prismatic light dispersion in glass elements.

### Bug Fixes

* Resolved text clipping for character descenders in progress card labels.
* Fixed aspect ratio squeezing of custom avatars during PNG export.
* Corrected asymmetrical padding in progress card modal wrapper.
* Added `document.fonts.ready` check and style computation delay to ensure high-fidelity PNG captures.

## [0.0.14](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.13...v0.0.14) (2026-02-02)

## [0.0.13](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.8...v0.0.13) (2026-02-02)


### Bug Fixes

* automatically detects colours from custom background now, fixed some ui inconsistencies ([14c65e4](https://github.com/Namankatiyar/pcm-tracker/commit/14c65e4e1a07f1df724ff348f9790dc808b17a84))

## 0.0.13 (2026-02-02)

### Added
- **Intelligent Accent Extraction**: Integrated `node-vibrant` to automatically extract the most vibrant color from custom wallpapers and set it as the primary application accent.
- **Glassmorphism Refractive Index Slider**: Introduced a secondary glass control to adjust light bending, saturation, and brightness effects on all glass panels globally.
- **Enhanced Exam Countdown**: Implemented validation to prevent selection of past dates for the exam target and added an automatic panel reset feature if the exam date has passed.
- **Unified Mock Score UI**: Replaced the native date input in the Mock Test modal with the custom themed `DatePickerModal` for a consistent design language.
- **Context-Aware Date Selection**: Configured the `DatePicker` to allow historical logging for Mock Tests while maintaining strict future-only selection for the Exam Countdown.

### Fixed
- **Button Label Readability**: Dynamically applied `var(--accent-text)` to buttons on bright accent backgrounds across the Analytics and Mock Score panels to ensure high contrast.
- **Mock Score Panel Resizing**: Fixed a layout bug where the mock score panel would resize inconsistently or overflow during window resizing by adjusting flex-shrink behavior.
- **Calendar Interaction**: Refined the `DatePickerModal` with better styling for disabled dates, including opacity feedback and a prohibited cursor icon.

## 0.0.12 (2026-02-02)

### Added
- **Custom Wallpaper Support**: Introduced the ability to upload custom background images via the Settings modal, creating a personalized workspace experience.
- **Glassmorphism Intensity Slider**: Added a global slider to manually adjust the blur and transparency levels of all UI panels in real-time.
- **Background Dimming Control**: Added a precision slider to control the opacity of the dimming overlay on custom wallpapers for better readability.
- **Analogous Accent Colors**: Implemented Hue-shift derivation to calculate a secondary accent color, resulting in more dynamic and vibrant background gradients.

### Fixed
- **Dark Mode Background Logic**: Fixed CSS selector hierarchy (`html[data-theme]`) to ensure custom backgrounds and gradients apply correctly to the root element.
- **Settings Modal Alignment**: Standardized the Appearance section layout by fixing alignment inconsistencies where items were centrally aligned instead of left-aligned.
- **Excess Header Padding**: Removed double-padding from the Settings modal header to provide a more compact and professional look.

## 0.0.11 (2026-02-01)

### Added
- **Mark Complete Action**: Integrated a "Mark Complete" button in the Study Clock when a Planner Task is selected. This allows users to save their session and mark the task as finished in one click, triggering completion confetti.
- **Manual Study Log Entry**: Added a dedicated system to manually log offline or past study sessions. Users can enter session titles, durations (hours/minutes), and link them to specific subjects and materials.
- **Unified Custom Calendar**: Replaced native browser date inputs in the manual entry flow with the themed `DatePickerModal` for a consistent, premium experience.

### Fixed
- **Modal Layering (Z-Index)**: Adjusted z-index hierarchy for overlaid modals to ensure the Calendar picker correctly appears on top of other modal windows.

## 0.0.10 (2026-01-31)

### Added
- **Priority Chapter Highlighting**: Chapters with priority (high, medium, low) are now visually highlighted in all chapter dropdowns across the Study Clock and Planner modals.
- **Smart Session Logging**: Selecting a Planner Task in the Study Clock now logs the session under the task's associated subject (Physics/Chemistry/Maths) instead of as a generic "custom" session.

### Fixed
- **Session categorization**: Fixed bug where sessions linked to Planner Tasks were incorrectly counted as "Custom" time instead of their respective subject.

## 0.0.9 (2026-01-31)

### Added
- **Unified Task Modal**: Refactored the task creation flow into a single-step modal with an inline toggle between "Chapter" and "Custom" tasks, improving speed and discoverability.
- **Optional Chapter Materials**: Enabled creation of general chapter-level tasks by making material selection optional.
- **Shift + Drag to Duplicate**: Introduced a productivity shortcut allowing users to duplicate tasks to other days by holding the `Shift` key while dragging.
- **Visual Feedback for Duplication**: Added a "Copy" indicator overlay with blue tinting when a duplication drag is active.

### Fixed
- **Drag-and-Drop Reliability**: Replaced the previous counter-based drag logic with a robust `relatedTarget` validation system, resolving several "stuck" overlay glitches.
- **Overlay Interference**: Applied `pointer-events: none` to drag indicators to ensure they don't block subsequent mouse events or flicker during fast movement.

## 0.0.8 (2026-01-31)

### Added
- **CSS Layers Architecture**: Implemented `@layer` rules (`reset`, `tokens`, `base`, `layout`, `components`, `features`, `utilities`) for explicit cascade control and override prevention.
- **Consolidated Design Tokens**: Introduced `src/styles/layers/_tokens.css` for centralized variable management.
- **Global Reset Layer**: Added `src/styles/layers/_reset.css` to standardize element behavior across all browsers.
- **Consolidated Component Styling**: Merged disparate modal styles into a single source of truth (`src/styles/components/modals.css`).

### Changed
- **Styling Refactor Phase 2**: Migrated from standard CSS imports to a single entry point (`src/styles/index.css`) utilizing CSS layers.
- **Refined Glassmorphism**: Standardized dark mode background tints to 0.35 opacity across all major panels (Dashboard, Study Clock, Planner) for a more transparent, premium look.
- **Dynamic Branding**: Refactored the header logo to use a dynamic gradient that adapts to the user's selected accent color.
- **Accent Palette Update**: Moved Amber (Yellow) to the primary position in the color picker and set it as the default theme for new users.
- **UI Logic Optimization**: Cleaned up excessive `!important` declarations by leveraging the new cascade priority system.

### Fixed
- **CSS Override Issues**: Resolved persistent styling conflicts where feature-specific styles were being overridden by global component rules.
- **Consistency Issues**: Fixed mismatched glassmorphism effects between the Study Clock panels and Dashboard cards.
- **Dark Mode Visibility**: Improved contrast and border definitions for glass panels in dark mode.

## 0.0.7 (2026-01-19)


### Added
- **Automated Versioning**: Integrated `commit-and-tag-version` for standardized Semantic Versioning and CHANGELOG automation.
- **New Release Scripts**: Added `pnpm release` and `pnpm release:dry` to `package.json`.
- **Modular Styling Architecture**: Established a new `/src/styles/` directory with separate files for `base`, `layout`, `theme`, and feature-specific CSS.
- **Page Loader**: Added a global loading component for improved UX during initial data parsing.
- **Rebranding**: Renamed project to **OJEE Tracker** across all documentation and configurations.

### Changed
- **Styling Refactor**: Decomposed the monolithic `App.css` into a modular design system using standardized CSS variables and tokens.
- **Package Management**: Migrated from `npm` to `pnpm` for faster, isolated dependency handling.
- **Routing**: Optimized `react-router-dom` v7 implementation for better navigation state handling.
- **Theme Logic**: Improved default theme selection based on device screen width.
- **UI Polishing**: Replaced scattered inline styles with semantic CSS classes from the new design system.

### Fixed
- **Mobile Performance**: Disabled glassmorphism (backdrop-blur) on mobile devices to prevent UI lag.
- **Header Alignment**: Standardized header heights and navigation item spacing.
- **Chapter Row Interaction**: Fixed z-index issues during drag-and-drop subject editing.

### Removed
- **Monolithic CSS**: Deleted `src/core/App.css` in favor of modular styles.
- **Legacy Configs**: Cleaned up `package-lock.json` and redundant dev-server settings.