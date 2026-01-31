# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

**Last Updated:** 2026-01-31

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