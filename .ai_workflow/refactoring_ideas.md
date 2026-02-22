# Refactoring Ideas - AnalyticsPanels.tsx

## 1. Component Decomposition
**Problem:** `AnalyticsPanels.tsx` is a "God Component" managing too many responsibilities.
**Solution:** Split into smaller, focused components:
- `StudyTimePanel`: Logic for weekly/monthly study hours.
- `MockScoresPanel`: Trend charts and the list of previous scores.
- `AddMockModal`: Isolated form state and validation for adding new scores.
- `ChartContainer`: A shared wrapper for Chart.js components to handle responsiveness and common styles.

## 2. Custom Hooks for Data Transformation
**Problem:** Data processing for charts is mixed with UI logic, making it hard to test and maintain.
**Solution:** Extract logic into custom hooks:
- `useStudyAnalytics(sessions, offset, mode)`: Returns processed labels and datasets for the study chart.
- `useMockAnalytics(scores)`: Handles sorting, serial numbering, and dataset generation for mock trends.

## 3. Standardized Chart Configurations
**Problem:** `barChartOptions`, `lineChartOptions`, and `mockChartOptions` share ~80% of the same code.
**Solution:** Create a `getBaseChartOptions(theme)` utility that returns a base configuration, then use deep merging or simple spreads for specific overrides (e.g., stacked scales for bars).

## 4. Theme Integration
**Problem:** Use of `MutationObserver` is brittle and bypasses the React context.
**Solution:** Replace with `useTheme()` from `ThemeContext`. This ensures charts re-render correctly when the theme toggles.

## 5. Date & Math Utilities
**Problem:** Inline date helpers like `getWeekDays` and `getMonthDays` clutter the component.
**Solution:** Move these to `src/shared/utils/date.ts` or a new `src/features/dashboard/utils/analyticsUtils.ts`.

## 6. Performance Optimization
**Problem:** `mockScores` is sorted multiple times during a single render (once for the chart, once for the list).
**Solution:** Perform a single sort at the top level or within a hook, and derive both the chart data and the list from that single sorted array.
