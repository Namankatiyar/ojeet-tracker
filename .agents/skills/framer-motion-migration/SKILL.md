---
name: framer-motion-migration
description: Use this skill whenever the user asks to migrate, update, or refactor legacy CSS animations to Framer Motion. This skill provides the decision matrix for what to convert, guidelines for adhering to the ojee-tracker design system, and code templates for converting modals, drawers, accordions, and drag-and-drop lists to Framer Motion safely.
---

# Framer Motion Migration Strategy

The `ojee-tracker` project is actively migrating its animation architecture from legacy CSS `@keyframes` and `setTimeout` delays to **Framer Motion**. This document outlines the strategy for executing this migration smoothly without violating the project's strict design system (`DESIGN_SYSTEM.md`).

## 1. Prerequisites

Before beginning any migration, verify that `framer-motion` is installed in `package.json`. If it is not, install it:

```bash
npm install framer-motion
```

## 2. Decision Matrix: Convert vs. Keep

Do NOT blindly convert every CSS animation to Framer Motion. Use the following rules:

### Migrate to Framer Motion
- **Modals, Dialogs, & Overlays**: Components that enter and exit the DOM (e.g., `DayModal`, `AddMockModal`). Removing React `isClosing` state hacks and CSS `.closing` classes in favor of `<AnimatePresence>`.
- **Drawers & Sheets**: Sliding panels that unmount upon closing (e.g., `ChapterDetailDrawer`).
- **Expandable Content / Accordions**: Components where height changes dynamically from `0` to `auto` (e.g., subtopic expansion rows).
- **Layout Morphing & Tab Indicators**: Elements that slide smoothly between active states (e.g., active tabs in `CommunityPage`).
- **Drag-and-Drop Reordering**: Swapping items in a list smoothly using the `layout` prop (e.g., chapter rows in syllabus tables or header columns).

### Keep in CSS (Do Not Migrate)
- **Infinite Loops & Loading States**: e.g., `@keyframes spin`, `pulse-dot`, `sync-spin`. CSS handles infinite GPU loops far more efficiently than JS.
- **Micro-interactions (Hover/Active)**: Standard button scaling (`transform: scale(1.05)` or `translateY(-1px)`) and background color changes on hover must remain in CSS using the project's `--transition-fast` token.
- **Ambient Glows**: Pulse animations on badges or background decorations.

---

## 3. Design System Alignment

Framer Motion transitions **must** emulate the feeling dictated by the `DESIGN_SYSTEM.md`. Avoid custom pixel values and stick to the token logic when possible.

### Easing and Timings
When writing `transition={{}}` in Framer Motion, map values approximately to the CSS custom properties:
- **Fast (`--transition-fast`)**: `0.15s`
- **Normal (`--transition-normal`)**: `0.25s`
- **Springs**: For scaling or sliding items in, prefer a subtle spring instead of linear tweens to achieve a "premium tactile feel" (e.g., `type: "spring", stiffness: 300, damping: 25`).

---

## 4. Implementation Guides & Code Templates

When replacing legacy CSS, follow these exact patterns to maintain a clean codebase.

### Pattern A: Modals and Overlays

**Legacy Pattern**: Relied on `isClosing` state in React, `setTimeout` to delay unmount, and a `.closing` class in CSS.

**Framer Motion Refactor**:
1. Wrap the conditional render in the parent component with `<AnimatePresence>`.
2. Convert the overlay and content divs to `<motion.div>`.
3. Strip `isClosing` logic and `setTimeout` from the component completely.
4. Remove all `@keyframes` (like `modalOverlayIn`, `modalSlideIn`) from the associated CSS file.

**Template**:
```tsx
import { motion, AnimatePresence } from 'framer-motion';

// In Parent Component:
<AnimatePresence>
  {isOpen && <MyModal onClose={() => setIsOpen(false)} />}
</AnimatePresence>

// Inside MyModal.tsx:
return (
  <motion.div
    className="modal-overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    onClick={onClose}
  >
    <motion.div
      className="modal-content glass-panel"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Content */}
    </motion.div>
  </motion.div>
);
```

### Pattern B: Expandable Subtopics / Accordions

**Legacy Pattern**: CSS `max-height` hacks or abrupt display toggles without exit animations.

**Framer Motion Refactor**: Use `initial={false}` on `AnimatePresence` to prevent it from animating on initial mount, and animate `height` to `"auto"`.

**Template**:
```tsx
<AnimatePresence initial={false}>
  {isExpanded && (
    <motion.div
      className="subtopic-expand-content"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      style={{ overflow: 'hidden' }}
    >
      {/* Content */}
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern C: Active Tab Indicators

**Legacy Pattern**: Modifying `.active` class backgrounds statically.

**Framer Motion Refactor**: Use `layoutId` to slide a visual indicator (like an underline or pill background) smoothly across tabs.

**Template**:
```tsx
{tabs.map((tab) => (
  <button 
    key={tab.key}
    className={`tab-btn ${activeTab === tab.key ? 'text-accent' : 'text-secondary'}`}
    onClick={() => setActiveTab(tab.key)}
  >
    {tab.label}
    {activeTab === tab.key && (
      <motion.div
        layoutId="activeTabIndicator"
        className="absolute inset-bottom-0 h-1 bg-accent"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
  </button>
))}
```

### Pattern D: Reorderable Lists / Drag & Drop

**Legacy Pattern**: The `useReorderDrag` hook instantly snaps elements into place when order changes.

**Framer Motion Refactor**: Make the list container elements (e.g., `<li>`, `<tr>`, or `<div>`) `<motion.div layout>` components. Framer Motion will automatically calculate the bounding boxes and smoothly slide siblings out of the way when the React list order changes.

**Template**:
```tsx
{items.map((item) => (
  <motion.div
    key={item.id} // CRITICAL: Must use unique, stable ID, not index
    layout
    transition={{ type: "spring", stiffness: 350, damping: 25 }}
    className="list-row"
  >
    {/* Content */}
  </motion.div>
))}
```

## 5. CSS Cleanup Protocol

After converting a component to Framer Motion:
1. Delete the corresponding `@keyframes` blocks from the CSS file (e.g., `@keyframes modalSlideIn`).
2. Delete the `animation:` declaration from the base CSS class.
3. Delete any auxiliary transition classes (e.g., `.day-modal-overlay.closing`).
4. **Important**: Verify you did not accidentally delete structural layout or responsive fallbacks in the CSS. If a modal had `display: flex; align-items: center;` it must remain. Only remove motion-specific logic.

## 6. Accessibility Notes

Respect user preferences. When implementing complex scaling or layout animations, consider wrapping them with `useReducedMotion` if the animation crosses large distances or flashes heavily.

```tsx
import { useReducedMotion } from "framer-motion";

const shouldReduceMotion = useReducedMotion();
const transition = shouldReduceMotion ? { duration: 0 } : { type: "spring" };
```
