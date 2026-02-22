# Refactoring Workflow - Planner.tsx

This workflow addresses the major performance bottlenecks and maintainability issues in `Planner.tsx`. The primary goal is to shift from O(N) data filtering on every render to a pre-computed O(1) lookup model.

---

## 1. Problems & Solutions

### Problem 1: Repetitive & Slow Data Filtering
- **Symptom:** The UI will become slow and laggy as the number of tasks or study sessions increases. Functions like `getTasksForDate`, `getStudyTimeForPeriod`, and inline session filtering inside the monthly view are called dozens of times on every state change (e.g., opening a modal, changing view mode).
- **Solution:**
    1.  **Create `usePlannerData` Hook**: Create a file `src/features/planner/hooks/usePlannerData.ts`.
    2.  **Pre-group Data**: Inside this hook, use `useMemo` to process the raw `tasks` and `sessions` arrays *once*. Create two `Map<string, T[]>` objects (or `Record<string, T[]>`), one for tasks and one for sessions, where the key is the date string (`YYYY-MM-DD`).
    3.  **Centralize Sorting**: The complex task sorting logic from `getTasksForDate` will be moved into this hook and applied when the tasks are grouped.
    4.  **Provide Lookups**: The hook will return the grouped data, allowing components to access tasks for a date with a fast `groupedTasks.get(dateStr)`.

### Problem 2: Monolithic Component Structure
- **Symptom:** `Planner.tsx` is over 400 lines long, making it difficult to debug and maintain. It mixes state management, data processing, and rendering for two completely different views (`weekly`, `monthly`). It also contains the `DayColumn` component definition.
- **Solution:**
    1.  **Extract `DayColumn.tsx`**: Create a new file for the `DayColumn` component.
    2.  **Extract `WeeklyView.tsx` and `MonthlyView.tsx`**: Create two new components. The `Planner` component will become a lightweight wrapper that holds the state for `viewMode` and `currentDate` and conditionally renders one of these two components.
    3.  **Extract `MonthCell.tsx`**: The huge block of JSX inside the `monthDays.map(...)` function will be moved into its own dedicated `MonthCell` component to simplify the `MonthlyView`.

### Problem 3: Un-memoized Calculations
- **Symptom:** Date array calculations (`getMonthDays`, `getMonday`, reordering week days) run on every single render, even when the date hasn't changed.
- **Solution:**
    1.  **Wrap in `useMemo`**: Inside the `Planner` component (or a new `useDateNavigator` hook), wrap the logic for calculating `weekDays`, `monthDays`, and the `reorderedDays` for the weekly view in `useMemo` hooks with `currentDate` as a dependency.

---

## 2. Potential Breakage & Prevention

### What could break?
1.  **Task Sorting Logic**: Moving the complex sorting logic into a hook could introduce bugs if not copied perfectly. The order of "New", "Delayed", and "Completed" tasks might change.
    - **Prevention**: Write a unit test for the sorting function before and after moving it to verify its behavior with different task combinations. Manually verify the task order in the UI after refactoring.
2.  **Drag-and-Drop**: The drag-and-drop functionality (`onMoveTask`, `onDuplicateTask`) relies on finding tasks by ID and passing data. Decoupling `DayColumn` could break prop drilling or context connections.
    - **Prevention**: Ensure all required handlers are correctly passed down from `Planner` -> `WeeklyView` -> `DayColumn`. Test drag-and-drop for both moving and copying (with Shift key) between every day of the week.
3.  **Initial Date Opening**: The `useEffect` that handles `initialOpenDate` might fire at the wrong time if the component hierarchy changes.
    - **Prevention**: Keep this `useEffect` in the top-level `Planner` component to ensure it has access to the modal state controls (`setIsTaskModalOpen`). Verify that clicking "Add Task" from other parts of the app still correctly opens the planner to the right date.
4.  **Monthly View Performance**: If the `MonthCell` component is not correctly memoized (`React.memo`), and the `usePlannerData` hook is not implemented correctly, performance could actually get *worse* due to prop changes on every cell.
    - **Prevention**: Wrap `MonthCell` in `React.memo`. Ensure that the props passed to it (like `tasksForDay`) are stable references. The `usePlannerData` hook helps achieve this. Use the React DevTools Profiler to confirm that cells only re-render when their specific data changes.
5.  **CSS Styling**: Extracting components into new files might break CSS rules that rely on specific parent-child relationships (e.g., `.planner-page .day-column`).
    - **Prevention**: Review `planner.css`. Most styles seem to be based on class names, which should be preserved. After refactoring, do a full visual review of both weekly and monthly views, paying close attention to spacing, alignment, and hover/drag states.
