# Refactoring Workflow - AnalyticsPanels.tsx

## Step 1: Extraction & Decomposition
**Goal:** Break down the monolithic `AnalyticsPanels.tsx` into specialized sub-components and hooks.

1.  **Extract Components**:
    - Create `src/features/dashboard/components/StudyTimePanel.tsx`.
    - Create `src/features/dashboard/components/MockScoresPanel.tsx`.
    - Create `src/features/dashboard/components/AddMockModal.tsx`.
2.  **Extract Hooks**:
    - Create `src/features/dashboard/hooks/useStudyTimeAnalytics.ts`: Logic for `weekly` vs `monthly` aggregation.
    - Create `src/features/dashboard/hooks/useMockScoresAnalytics.ts`: Logic for sorting and dataset generation.
3.  **Extract Utils**:
    - Move `getWeekDays`, `getMonthDays`, and `getStudyTimeBySubject` to `src/features/dashboard/utils/analyticsUtils.ts`.
    - Add a `getChartOptions(theme, type)` utility.

## Step 2: Implementation & Cleanup
**Goal:** Replace old code with the new modular structure and integrate with existing contexts.

1.  **Theme Integration**:
    - Replace `MutationObserver` and manual theme state with `const { theme } = useTheme()`.
    - Use `theme === 'dark'` to drive chart colors.
2.  **State Management**:
    - Move `newMock` state and its validation logic into `AddMockModal.tsx`.
    - Lift only necessary props (sessions, scores, handlers) to the parent `AnalyticsPanels.tsx`.
3.  **Performance Fixes**:
    - Ensure `useMemo` in hooks correctly uses dependencies like `theme`, `sessions`, and `offset`.
    - Single-pass sorting for `mockScores`.

## Step 3: Validation & Testing
**Goal:** Ensure no regressions and verify visual consistency.

1.  **Visual Audit**:
    - Check chart responsiveness in both `weekly` and `monthly` modes.
    - Verify that subject colors match the main site theme.
    - Confirm modal layering and focus management.
2.  **Logic Verification**:
    - Toggle between weeks/months; ensure dates and labels update correctly.
    - Add/delete mock scores; verify immediate chart and list updates.
    - Toggle dark/light mode; verify chart axes and grid lines refresh.

## Potential Risks (What Could Break)
- **Chart.js Reactivity**: If the `data` object provided to `<Bar />` or `<Line />` isn't memoized properly, it can cause unnecessary re-renders or "flashing" during state updates.
- **CSS Context**: Moving components to separate files might break styles relying on specific parent selectors (e.g., `.analytics-panel .panel-header`). Styles should be verified or scoped.
- **Date Offsets**: Ensure that the `weekOffset` and `monthOffset` logic is preserved exactly to avoid shifts in displayed data.
- **Scrollable Charts**: The "scrollable" class and the inline `minWidth` calculation for many mock scores must be carefully ported to ensure long-term usability.
