# Target Lecture and Revision Count Feature Specification

**Date**: 2026-07-16  
**Status**: Approved / Ready for Implementation Plan  
**Target Files**: 
- `src/shared/types/index.ts`
- `src/features/subjects/components/ChapterDetailDrawer.tsx`
- `src/features/subjects/components/ChapterRow.tsx`
- `src/styles/features/subjects.css`

---

## 1. Goal & Motivation

Students tracking their JEE syllabus across Physics, Chemistry, and Mathematics often have custom goals for how many lectures they need to watch (`targetLectureCount`) and how many revision passes they intend to complete (`targetRevisionCount`) for each chapter.

Currently, the application allows incrementing and decrementing `Revision Count` and `Lecture Count` indefinitely, but does not provide a way to set or measure progress against a defined target goal.

This feature introduces optional target counts for both lectures and revisions, displaying progress badges (`current / target`) both inside the Chapter Workspace Drawer (`ChapterDetailDrawer.tsx`) and on the main chapter list rows (`ChapterRow.tsx`). The feature is 100% optional: counters function normally whether a target is specified or not.

---

## 2. User Experience & UI Design (Approach 2: Expandable Target Sub-Row)

### 2.1 Chapter Detail Drawer (`ChapterDetailDrawer.tsx`)
In the **Status & Progress** section of the drawer:
- **Revision Count Main Row**:
  - Displays the label `Revision Count`.
  - When `targetRevisionCount` is defined and `> 0`, renders a progress badge right beside the label: e.g., `3 / 5 done` (or `5 / 5 🎉` when `revisionCount >= targetRevisionCount`).
  - Next to the main stepper (`- [ 3 ] +`), renders a toggle button:
    - If `targetRevisionCount` is `undefined` or `0`: `<button className="secondary-btn target-toggle-btn">+ Target</button>`
    - If `targetRevisionCount > 0`: `<button className="secondary-btn target-toggle-btn active">🎯 Goal: 5</button>`
- **Revision Target Sub-Row (Expanded)**:
  - When the user clicks `+ Target` or `🎯 Goal: 5` (toggling local state `isRevisionTargetOpen`), a sub-row expands beneath the main Revision Count row using `Framer Motion` (`AnimatePresence`).
  - Contains label: `Target Revisions`.
  - Contains a `modern-stepper` (`- [ input ] +`) bounded at minimum `0`.
  - Contains a clear button (`<button className="icon-btn-reset"><X size={14} /></button>`) that sets `targetRevisionCount = undefined` and closes/resets the target.
- **Lecture Count Main Row & Sub-Row**:
  - Follows the exact same layout and interaction mechanics for `lectureCount` and `targetLectureCount` (toggling local state `isLectureTargetOpen`).

### 2.2 Chapter Row List Card (`ChapterRow.tsx`)
In the `chp-row-stats` section of `ChapterRow.tsx` (the summary metrics shown on each chapter row):
- If `targetRevisionCount !== undefined && targetRevisionCount > 0`:
  - Displays: `<span className="chp-stat-val">{detail.revisionCount || 0}/{detail.targetRevisionCount}</span>` next to label `Revisions`.
- Otherwise (if no target is set):
  - Displays: `<span className="chp-stat-val">{detail.revisionCount}</span>` next to label `Revisions`.
- If `targetLectureCount !== undefined && targetLectureCount > 0`:
  - Displays: `<span className="chp-stat-val">{detail.lectureCount || 0}/{detail.targetLectureCount}</span>` next to label `Lectures`.
- Otherwise (if no target is set):
  - Displays: `<span className="chp-stat-val">{detail.lectureCount}</span>` next to label `Lectures`.

---

## 3. Technical Architecture & Data Model

### 3.1 Type Changes (`src/shared/types/index.ts`)
Add `targetRevisionCount` and `targetLectureCount` to `ChapterDetailProgress`:
```ts
export interface ChapterDetailProgress {
  attemptedByMaterial: Record<string, number>;
  confidence?: ConfidenceLevel;
  lastRevised?: string;
  revisionCount?: number;
  targetRevisionCount?: number;
  lectureCount?: number;
  targetLectureCount?: number;
  notes?: string;
  revisionHistory?: Array<{
    date: string;
    confidence: ConfidenceLevel;
  }>;
  lastActiveDate?: string;
}
```

### 3.2 State & Persistence Compatibility (`UserProgressContext.tsx`)
No changes required to `UserProgressContext.tsx`. The existing `handleUpdateChapterDetail` (and `updateChapterDetail` inside `UserProgressProvider`) uses partial updates:
```ts
detail: {
  ...currentDetail,
  ...patch,
}
```
When `ChapterDetailDrawer.tsx` calls `onUpdateDetail(chapter.serial, { targetRevisionCount: 5 })`, the patch is automatically merged and persisted to local storage (`ojee-tracker-progress`).

---

## 4. Styling Requirements (`src/styles/features/subjects.css`)

All styling must adhere to `ojee-tracker-design` tokens (`var(--space-*)`, `var(--radius-*)`, `var(--text-*)`, `var(--accent-*)`). No hardcoded hex colors or arbitrary px spacings.

- **Target Progress Badge (`.target-progress-badge`)**:
  - Small pill badge inside `.drawer-field label` or header.
  - `font-size: var(--text-xs);`
  - `background: var(--accent-light); color: var(--accent); padding: 2px var(--space-2); border-radius: var(--radius-full); font-weight: 600;`
  - Complete state (`.target-progress-badge.completed`): `background: color-mix(in srgb, var(--confidence-green) 15%, transparent); color: var(--confidence-green);`
- **Target Toggle Button (`.target-toggle-btn`)**:
  - Compact button (`height: 28px; padding: 0 var(--space-2); font-size: var(--text-xs); border-radius: var(--radius-xs);`).
  - Active state (`.target-toggle-btn.active`): `border-color: var(--accent); color: var(--accent); background: var(--accent-light);`
- **Expandable Sub-Row (`.target-sub-row`)**:
  - `padding-left: var(--space-4); margin-top: var(--space-2); border-left: 2px solid var(--border);`
  - Smooth height animation via Framer Motion (`initial={{ height: 0, opacity: 0 }}`, `animate={{ height: 'auto', opacity: 1 }}`).

---

## 5. Testing & Verification

1. **Unit / Component Tests**:
   - Verify `ChapterDetailDrawer` renders `+ Target` button when no target exists.
   - Verify expanding sub-row and setting `targetRevisionCount = 5` calls `onUpdateDetail` with `{ targetRevisionCount: 5 }`.
   - Verify clicking reset (`X`) calls `onUpdateDetail` with `{ targetRevisionCount: undefined }`.
   - Verify `ChapterRow` displays `3/5` when `targetRevisionCount: 5` and `revisionCount: 3`.
2. **Manual Verification**:
   - Run `pnpm run dev`.
   - Open any subject and click a chapter to open `ChapterDetailDrawer`.
   - Set Revision target to 5, increment Revision count to 3 -> see `3 / 5 done` inside drawer and `3/5` on chapter row.
   - Increment Revision count to 5 -> see `5 / 5 🎉` badge.
   - Clear target -> verify drawer returns to standard `Revision Count` view and `ChapterRow` displays just `5`.
