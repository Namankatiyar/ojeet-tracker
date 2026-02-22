# Refactoring Workflow Analysis: `App.tsx` Decomposition

This document outlines the risks, potential breaking changes, and error-proneness associated with refactoring `src/core/App.tsx` into Context Providers and Custom Hooks.

## 1. Executive Summary

Refactoring `App.tsx` from a "God Component" to a modular architecture using Context API is **High Risk / High Reward**.

*   **Reward:** drastically improved maintainability, testability, and separation of concerns.
*   **Risk:** subtle regression bugs in data synchronization (especially between `Planner` and `Subject` views), performance degradation due to unnecessary re-renders, and initialization race conditions.

## 2. Exhaustive List of Potential Breaking Features

These are the specific features most likely to break during the transition.

### A. Critical Data Synchronization (High Risk)
1.  **Subject <-> Planner Sync:**
    *   *Current Behavior:* Toggling a chapter task in `Planner` updates `progress` state (Subject view) immediately via `setProgress` within `handleTogglePlannerTask`.
    *   *Risk:* Decoupling these states into separate contexts (`UserProgressContext` vs `SubjectDataContext`) might break this sync if the contexts don't expose methods to update each other, or if the dependency chain is wrong.
    *   *Manifestation:* Marking a chapter as done in Planner doesn't show as done in the Subject page, or vice versa.

2.  **Data Merging Logic (`mergedSubjectData`):**
    *   *Current Behavior:* A complex `useMemo` merges `subjectData`, `customColumns`, `excludedColumns`, and `materialOrder`.
    *   *Risk:* Moving this to `SubjectDataContext` requires ensuring all dependencies (`customColumns`, etc.) are available *synchronously* or handled reactively. If `subjectData` is loaded async (CSV parsing), the merge might run prematurely with null data.
    *   *Manifestation:* Subject pages load empty, crash due to "cannot read property of null", or show duplicate columns.

3.  **Auto-Shift Logic:**
    *   *Current Behavior:* Runs in `useEffect` on mount to shift past tasks to today.
    *   *Risk:* If moved to a hook (`useAutoShift`), it might run too often (infinite loop) or not at all (if not called in the right place in the provider tree). It relies on `plannerTasks` being fully loaded from localStorage first.
    *   *Manifestation:* Tasks from yesterday don't move to today, or the app freezes due to infinite updates.

### B. UI/UX & Theming (Medium Risk)
4.  **Dynamic CSS Variables (Glassmorphism/Theme):**
    *   *Current Behavior:* `useEffect` updates `document.documentElement` style properties based on state.
    *   *Risk:* If the `ThemeProvider` doesn't initialize fast enough or uses `useEffect` instead of `useLayoutEffect`, there might be a "Flash of Unstyled Content" (FOUC) or wrong colors on initial load.
    *   *Manifestation:* Dark mode flickers to light mode on reload; glass effect missing.

5.  **Keyboard Shortcuts (Alt+N):**
    *   *Current Behavior:* `useEffect` adds `keydown` listener.
    *   *Risk:* If the hook `useGlobalShortcuts` isn't mounted at the root level (or inside the Router), `navigate` might not be available or might throw an error.
    *   *Manifestation:* `Alt+N` stops working or crashes the app.

### C. Performance & React Lifecycle (Medium Risk)
6.  **Context Re-render Cascades:**
    *   *Current Behavior:* `App` passes specific props to `Dashboard`, `Planner`, etc.
    *   *Risk:* If `UserProgressContext` updates `plannerTasks`, *every* component consuming that context will re-render. If not optimized (e.g., splitting context into State/Dispatch or using `useMemo`), typing in a task input could lag the whole app.

## 3. Error-Proneness Assessment

| Refactoring Step | Error Probability | Severity | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Extract ThemeContext** | **Low** | Low | Isolate CSS var logic. Use `useLayoutEffect`. Verify persistence keys match exactly. |
| **Extract SubjectDataContext** | **Medium** | High | Ensure CSV parsing `useEffect` handles race conditions. Verify `mergedSubjectData` memoization is correct. |
| **Extract UserProgressContext** | **High** | Critical | **Crucial:** Ensure `useProgress` (analytics) has access to *both* `progress` (state) and `subjectData` (structure). This creates a dependency: `UserProgressContext` must be inside `SubjectDataContext`. |
| **Modularize Routing** | **Low** | Medium | Ensure `Navigate` and `useLocation` work. Verify lazy loading `Suspense` boundaries are preserved. |

## 4. Implementation Safeguards

To minimize errors, follow this strict order of operations:

1.  **Create Providers *without* deleting code from App.tsx first.**
    *   Build `ThemeContext.tsx`.
    *   Wrap `App` with it.
    *   Verify `useTheme()` works in a child component.
    *   *Then* delete theme code from `App.tsx`.

2.  **Verify Context Dependency Order.**
    *   `ThemeContext` (Independent) -> Outer
    *   `SubjectDataContext` (Loads structure) -> Middle
    *   `UserProgressContext` (Depends on structure for analytics) -> Inner

3.  **Strict Typing.**
    *   Do not use `any`. Define strict interfaces for Context values.
    *   Export types like `SubjectDataContextType` to ensure consumers know what they get.

4.  **Smoke Tests.**
    *   After each extraction, manually verify:
        *   Does `Dashboard` show progress bars? (Tests `UserProgress` + `SubjectData` integration).
        *   Does `Planner` show tasks? (Tests `UserProgress` persistence).
        *   Does `Alt+N` work? (Tests global hooks).
