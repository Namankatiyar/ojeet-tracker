# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.0.8](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.7...v0.0.8) (2026-02-02)


### Features

* added custom backgrounds and opacity adjustment ([cdb094e](https://github.com/Namankatiyar/pcm-tracker/commit/cdb094e157159564a48dafd278d6bef69b7a8c9c))
* custom time addition option in study clock ([0f63146](https://github.com/Namankatiyar/pcm-tracker/commit/0f6314614ff1d123eb026d35fdc6ebf6d6ffe64d))
* removing the monolithic css, this now uses distributed css styling for better management ([9560fe9](https://github.com/Namankatiyar/pcm-tracker/commit/9560fe9b1d46aeb8a753e94a3732263265369f7e))


### Bug Fixes

* added visual highlighting for priority in dropdowns ([f4943d4](https://github.com/Namankatiyar/pcm-tracker/commit/f4943d49e7b57dac960a4828ab676f741619ba54))
* unified custom and subject wise task creation process ([26e549c](https://github.com/Namankatiyar/pcm-tracker/commit/26e549c2023ab2d1b85171b8c79b2da4997d6e11))

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