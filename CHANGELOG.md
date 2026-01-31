# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

**Last Updated:** 2026-01-19

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