# Refactoring Plan for src/core/App.tsx

The `App.tsx` file currently acts as a "God Component," managing too many responsibilities: routing, global state persistence, business logic (data merging, auto-shifting tasks), and UI theming side-effects. This makes it hard to maintain and test.

## 1. Extract State to Context Providers
Move related state and handlers into React Contexts to eliminate prop drilling and declutter `App.tsx`.

*   **`ThemeContext`**:
    *   **State**: `theme`, `accentColor`, `backgroundUrl`, `dimLevel`, `glassIntensity`, `glassRefraction`.
    *   **Logic**: All `useEffect` blocks related to applying CSS variables, hex/HSL color calculations, and dark/light mode toggling.
    *   **Benefit**: `App.tsx` won't need to know about CSS variable logic.

*   **`SubjectDataContext`**:
    *   **State**: `subjectData`, `customColumns`, `excludedColumns`, `materialOrder`.
    *   **Logic**: CSV loading (`useEffect`), data merging (`useMemo` currently in App), and column/chapter management handlers (`handleAddColumn`, `handleAddChapter`, etc.).
    *   **Benefit**: Encapsulates the complex CSV+CustomColumn merging logic.

*   **`UserProgressContext`**:
    *   **State**: `progress`, `plannerTasks`, `studySessions`, `mockScores`.
    *   **Logic**: `useProgress` integration, task auto-shifting, and sync logic between Planner tasks and Chapter progress.
    *   **Benefit**: Centralizes the "business logic" of the app.

## 2. Create Custom Hooks for Side Effects
Extract specific logic into hooks to keep the component body clean.

*   **`useGlobalShortcuts()`**: Move the `Alt+N` keyboard listener here.
*   **`useDailyQuote()`**: Move the daily quote rotation and persistence logic here.
*   **`useAutoShiftTasks()`**: Encapsulate the logic that checks and moves overdue tasks.

## 3. Modularize Routing
*   Create a `AppRoutes.tsx` component that holds the `Routes` and `Route` definitions.
*   `App.tsx` effectively becomes a wrapper that provides Contexts and renders `Layout` (Header) and `AppRoutes`.

## 4. Implementation Steps

1.  **Phase 1: Theme Extraction**
    *   Create `src/core/context/ThemeContext.tsx`.
    *   Move all style-related `useState`, `useLocalStorage`, and `useEffect`s there.
    *   Wrap `App` content with `ThemeProvider`.

2.  **Phase 2: Data Logic Separation**
    *   Create `src/core/context/DataContext.tsx`.
    *   Move `subjectData` loading and merging logic there.
    *   Move `plannerTasks` and `progress` sync logic there.

3.  **Phase 3: Component Cleanup**
    *   Replace direct state access in `App.tsx` with `useTheme()`, `useData()`, etc.
    *   Pass simplified props to children or have children consume Context directly (preferred).

## 5. Outcome
*   **Lines of Code**: `App.tsx` should drop from ~600+ lines to <100 lines.
*   **Performance**: Reduced re-renders since `App.tsx` won't update on every minor state change (context consumers will update individually).
*   **Maintainability**: Business logic will be isolated in specific files rather than mixed with routing and layout code.
