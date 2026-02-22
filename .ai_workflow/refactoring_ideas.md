# Refactoring Ideas - Planner.tsx

## 1. Performance: Inefficient Data Processing
**Problem:** The component performs expensive filtering and sorting operations on the entire `tasks` and `sessions` arrays on every single render.
- `getTasksForDate()` is called for every day in the view (~42 times on month view), each time filtering the whole `tasks` array.
- `getStudyTimeForPeriod()` filters the `sessions` array on every render.
- The monthly view cell calculates `dayStudyHours` by filtering `sessions` again for each day.
**This is the biggest issue and will cause significant lag as data grows.**

**Solution:**
- **Create a `usePlannerData` hook:** This hook will take `tasks` and `sessions` and use `useMemo` to create a `Map` or `Record` where tasks and sessions are pre-grouped by date (`Record<string, PlannerTask[]>`).
- **O(1) Lookups:** Components will then access data for a specific date using a fast key lookup (e.g., `groupedTasks[dateStr]`) instead of an O(N) filter.

## 2. Component Decomposition
**Problem:** `Planner.tsx` is a monolithic component (400+ lines) responsible for rendering the weekly view, the monthly view, managing all state, and even contains another large component (`DayColumn`) within it.

**Solution:**
- **Extract `DayColumn`**: Move the `DayColumn` component into its own file: `src/features/planner/components/DayColumn.tsx`.
- **Create View Components**: Create separate components for the two distinct views to isolate their complex logic.
    - `WeeklyView.tsx`: Manages the layout and drag-and-drop logic for the 7-day view.
    - `MonthlyView.tsx`: Manages the grid generation for the monthly calendar.
- **Create `MonthCell`**: Create a `MonthCell.tsx` component to encapsulate the complex rendering logic for a single day in the monthly calendar, which is currently a massive block inside a `.map()` call.

## 3. Code Bloat & Readability
**Problem:**
- The render method contains complex JSX with inline data transformations, such as the IIFE `(() => { ... })()` to reorder days in the weekly view.
- The sorting logic inside `getTasksForDate` is complex and undocumented.
- Date calculations for the calendar grid (`getMonthDays`, `getMonday`) are recalculated on every render.

**Solution:**
- **Memoize Calculations**: Use `useMemo` to calculate the `weekDays`, `reorderedWeekDays`, and `monthDays` arrays so they are not re-computed on every render.
- **Isolate Logic**: Move the day-reordering logic out of the JSX and into a `useMemo` hook.
- **Simplify State**: Extract date navigation logic (`handlePrevWeek`, `handleNextMonth`, etc.) into a dedicated `useDateNavigator` custom hook to clean up the main component.

## 4. Fundamentally Flawed Logic
**Problem:** The "random" cross image for past days in the monthly view uses `(date.getDate() + date.getMonth()) % 5`. This is deterministic and will always show the same cross for the same date, not a truly random one on each view. The styling is also applied inline.

**Solution:**
- While not a critical bug, this logic adds complexity to the render loop. If the "randomness" is not a key feature, it could be simplified or made truly random with a memoized map of dates to random numbers if needed. The styling should be moved to CSS.
