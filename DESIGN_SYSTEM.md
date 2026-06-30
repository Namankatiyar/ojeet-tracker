# DESIGN_SYSTEM.md

This document serves as the single source of truth for the **ojee-tracker** visual system, layout guidelines, component standards, and writing guidelines. All developers and AI coding assistants must strictly adhere to these specifications during frontend implementation.

---

## 1. Design Philosophy: Grounded in the Subject

`ojee-tracker` is an offline-first, high-focus JEE/OJEE syllabus tracker and study planner designed for students preparing for one of the most demanding competitive exams.

- **Workspace Aesthetic**: The interface is designed as an immersive, high-performance workspace. It utilizes a premium translucent glassmorphism in dark mode (layered shadows, internal glowing boundaries, and blurred backdrop refractions) and clean card surfaces in light mode.
- **Dynamic Adaptability**: The interface supports a dynamic accent color engine. When a user picks a custom accent color, the application shifts the color's hue by 60 degrees to compute a complementary secondary accent, updates the PWA theme, and recalculates text contrast boundaries (switching text between `#ffffff` and `#000000` depending on accent brightness).
- **Responsive Performance**: On desktop (viewport width $\ge$ 48rem), the application renders full glassmorphism, blur refractions, and fixed sections. On mobile (viewport width < 48rem), glassmorphism falls back to solid background layers (`var(--bg-secondary)`) to avoid GPU scrolling lag.

---

## 2. Design Tokens

### 2.1 Typography

Typography carries the personality of the page. Pair the display and body faces deliberately:

- **Primary Typeface Stack**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` for clean readability.
- **Timer/Digits Monospace Stack**: `'Montserrat', monospace`
  > [!IMPORTANT]
  > Stopwatch displays and timer numbers must use Montserrat/monospace to prevent visual "jittering" or layout reflow when numbers increment.

#### Fluid Font Sizes (clamped)

- `--text-xs`: `0.75rem` (12px - Badges, labels, tags)
- `--text-sm`: `0.875rem` (14px - Sidebar items, secondary buttons, subtopic text)
- `--text-base`: `clamp(0.9375rem, 0.25vw + 0.875rem, 1rem)` (15px-16px - Base body text, input fields)
- `--text-lg`: `clamp(1.125rem, 0.8vw + 0.95rem, 1.25rem)` (18px-20px - Small headings, card titles)
- `--text-xl`: `clamp(1.375rem, 1.5vw + 1rem, 1.75rem)` (22px-28px - Primary headers, page titles)

#### Font Weight Conventions

- `400`: Regular body reading and secondary copy.
- `500`: Interactive navigation, buttons, and custom select labels.
- `600` / `700`: Layout headings, active nav items, and primary actions.

### 2.2 Strict Spacing Scale (4px Base)

All layout measurements (padding, margins, gaps, heights) must pull exclusively from this unit token scale. No arbitrary values (e.g. `11px`, `19px`) are allowed.

- `--space-1`: `0.25rem` (4px)
- `--space-2`: `0.5rem` (8px)
- `--space-3`: `0.75rem` (12px)
- `--space-4`: `1rem` (16px)
- `--space-5`: `1.25rem` (20px)
- `--space-6`: `1.5rem` (24px)
- `--space-8`: `2rem` (32px)
- `--space-10`: `2.5rem` (40px)
- `--space-12`: `3rem` (48px)
- `--space-16`: `4rem` (64px)

### 2.3 Semantic Color System

No raw hex values or RGB definitions may exist in component CSS logic. All styling maps permanently to defined semantic functions.

#### Background Topology

- `--color-bg-base`: `#f8fafc` (Light) / `#0a0a0f` (Dark) — Underlying application wrapper color.
- `--color-bg-primary`: Slightly tinted by accent — Root layout layer.
- `--color-bg-secondary`: `#ffffff` (Light) / `rgba(18, 18, 26, 0.35)` (Dark) — Primary structural containers, headers, modals.
- `--color-bg-tertiary`: `#f1f5f9` (Light) / `rgba(26, 26, 40, 0.5)` (Dark) — Nested cards, inputs, dense arrays.

#### Text Hierarchy

- `--color-text-primary`: `#0f172a` (Light) / `#f1f5f9` (Dark) — High contrast reading.
- `--color-text-secondary`: `#475569` (Light) / `#94a3b8` (Dark) — Standard body contrast.
- `--color-text-muted`: `#94a3b8` (Light) / `#64748b` (Dark) — Metadata, placeholders.

#### Borders

- `--color-border`: `#e2e8f0` (Light) / `rgba(255, 255, 255, 0.08)` (Dark) — Default border.
- `--color-border-hover`: `#cbd5e1` (Light) / `rgba(255, 255, 255, 0.15)` (Dark) — Hover border.

#### Dynamic Accent System

Accent tokens are dynamically written to the `:root` element by the theme provider. Always use the following semantic mappings:

- `--accent`: Primary interactive color (defaults to `#f59e0b` amber or `#06b6d4` cyan).
- `--accent-hover`: 10% darkened variant for hover feedback.
- `--accent-light`: Translucent tint (10-15% opacity) for active list items or highlights.
- `--accent-text`: Calculated high-contrast text color (`#ffffff` or `#000000`) based on accent brightness.
- `--accent-border`: Border styling wrapping interactive elements.
- `--secondary-accent`: Hue-shifted complementary accent used for ambient background gradients.

#### Subject & Priority Semantics

- **Subject Colors**:
  - Physics: `var(--color-physics)` $\rightarrow$ `#6366f1` (Indigo)
  - Chemistry: `var(--color-chemistry)` $\rightarrow$ `#10b981` (Emerald)
  - Mathematics: `var(--color-maths)` $\rightarrow$ `#f59e0b` (Amber)
- **Priority/Confidence Levels**:
  - High Priority / Level 1 Confidence: `var(--color-priority-high)` $\rightarrow$ `#ef4444` (Red), BG: `var(--color-priority-high-bg)`
  - Medium Priority / Level 2 Confidence: `var(--color-priority-medium)` $\rightarrow$ `#f59e0b` (Amber), BG: `var(--color-priority-medium-bg)`
  - Low Priority / Level 3 Confidence: `var(--color-priority-low)` $\rightarrow$ `#22c55e` (Green), BG: `var(--color-priority-low-bg)`
  - Level 4 Confidence: `var(--color-confidence-purple)` $\rightarrow$ `#8b5cf6` (Purple)
  - Level 5 Confidence (Mastered): `var(--color-confidence-green)` $\rightarrow$ `#22c55e` (Green)

### 2.4 Border Radius

- `--radius-xs`: `4px` (Tags, small interactive icons)
- `--radius-sm`: `8px` (Inputs, buttons)
- `--radius-md`: `12px` (Cards, Menus, Modals)
- `--radius-lg`: `16px` (Large container bounds)
- `--radius-full`: `9999px` (Badges, Avatars)

### 2.5 Shadows & Glassmorphism

- `--shadow-sm`, `--shadow-md`, `--shadow-lg`: Depth logic.
- **Glass Specifics (Mandatory for Dark Mode Containers)**:
  - Primary interactive panels: `var(--panel-bg)` with `backdrop-filter: blur(var(--panel-blur))` (resolves to `none` in light mode).
  - Highlight Ring: `box-shadow: var(--panel-inner-glow), var(--panel-shadow)`.

### 2.6 Motion

Transitions strictly limit expensive browser paints. Only properties related to `transform`, `opacity`, and `color`/`background` are to be transitioned.

- `--transition-fast`: `150ms ease` (Hover feedbacks, toggles)
- `--transition-normal`: `250ms ease` (Modal mounting, sidebar drawer reveals)
- `--transition-slow`: `400ms ease` (Ambient entry, sync alerts)
- **Tactile Hover Standard**: Interactive primary elements (cards, buttons) utilize `transform: translateY(-1px)` or `transform: scale(1.05)` rather than excessive glow injections to maintain minimal rendering strain.

---

## 3. Component Standards

### 3.1 Buttons

- **Primary Button (`.primary-btn`)**:
  - Background is `var(--accent)`, text is `var(--accent-text)`.
  - Border uses `var(--accent-border)` to guarantee high contrast.
  - Hover triggers `background: var(--accent-hover)` and `transform: translateY(-1px)`.
  - Disabled uses `opacity: 0.5; cursor: not-allowed; pointer-events: none;`.
- **Secondary Button (`.secondary-btn`)**:
  - Background is transparent, border is `1px solid var(--border)`.
  - Hover shifts background to `var(--bg-tertiary)` and border-color to `var(--text-secondary)`.
- **Small Icon Button (`.icon-btn-small`) / Reset Buttons**:
  - Height & Width: Standardized to `24px` (or `var(--space-6)`).
  - Border radius is strictly `var(--radius-xs)` (4px).
  - Hover swaps background to `var(--accent)` and text color to white.

### 3.2 Inputs & Custom Selects

- **Inputs and Textareas**:
  - Vertically sized using `padding: var(--space-3)` (`0.75rem`).
  - Dark mode backgrounds must be translucent: `background: rgba(0, 0, 0, 0.3)`.
  - Focus state: `outline: none`, swapping borders to `var(--glass-border-light)` (dark mode) or `var(--accent)` (light mode) with a diffuse `3px` box shadow ring.
- **Custom Select (`.custom-select-container`)**:
  - Uses absolute positioning for popover options list (`.custom-select-options`).
  - Options list implements glassmorphism in dark mode (`@layer components` via `.glass-panel`).
  - Highlight states map to priority classes (`.priority-high`, `.priority-medium`, etc.).

### 3.3 Checkboxes

- **Checkbox Container (`.checkbox-container`)**:
  - Custom span checkmark: `.checkmark` using `width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--border);`.
  - Active checked style: `background: var(--accent); border-color: var(--accent);` rendering checkmark character `✓`.
  - Indeterminate State (`.checkbox-container.indeterminate`):
    - Input `indeterminate` attribute toggled in JS.
    - Checkmark symbol changes to a horizontal dash `-` or partial block.

### 3.4 Cards & Surfaces

- **Aesthetic Definition**: Must apply `.glass-panel` or `.glass-card` classes.
- **Performance boundary**: Mobile layouts discard blur properties. Ensure cards fall back to opaque `var(--bg-secondary)` below the `48rem` media breakpoint.

### 3.5 Chapter Workspace Drawer (`.chapter-drawer`)

- Slides out from the right using an absolute modal overlay.
- Contains:
  - Header with serial and chapter title.
  - Confidence range input (`.confidence-slider`) colored dynamically by the confidence levels.
  - Steppers with Plus/Minus buttons for attempted questions and revision counts, alongside a reset button (`X` icon) to quickly reset values.
  - Subtopics grid displaying NCERT, PYQ, and Module check states side-by-side with question tallies.
  - Revision log showing relative date strings, a "Mark Today" shortcut, and a reset date button.

---

## 4. Layout Rules

- **Grid Alignment**: Standardize on `gap: var(--space-4)` or `var(--space-2)` for column separation.
- **Alignment Rules**: Do not use pixel padding for centering. Use `display: flex; align-items: center; justify-content: center` to ensure dynamic alignment remains flawless alongside fluid typography.
- **Maximum Execution Layout**: Main views restricted to `max-width: var(--content-max-width)` (`1200px`) clamped over centered auto-margins, or `max-width: var(--content-max-width-wide)` (`1400px`) for dense planners.

---

## 5. Writing & Microcopy Rules

Words are design material. Bring the same intentionality to copy that you would bring to spacing and color:

- **Write from the End User's Side**: Name elements by what people recognize and control (e.g., "Manage notifications" rather than "Webhook configuration").
- **Active Voice**: Default to action-oriented, clear verbs. Buttons should say exactly what happens when clicked (e.g., "Save changes", "Mark today", "Clear", "Delete", "Add task").
- **Cohesion & Consistency**: Keep names and actions consistent across the application flow (e.g., a "Publish" action yields a "Published" toast).
- **Sentence Case**: Always use sentence case for page titles, headings, inputs, and button labels (e.g., "Mark today", "Clear revision date", "Study materials"). Avoid Title Case or UPPERCASE unless required by brand guidelines.
- **Failures & Emptiness as Navigation**: Explain errors clearly, detailing how the user can resolve them, in a clear and objective voice. Treat empty states as active invitations to act (e.g., direct calls-to-action).
- **Confidence Rating Labels**:
  - Level 1: "1 - Need Help"
  - Level 2: "2 - Low"
  - Level 3: "3 - Medium"
  - Level 4: "4 - High"
  - Level 5: "5 - Mastered"
- **Revision Relative Time**:
  - Show "Never" when `lastRevised` is null or undefined.
  - Show "Revised today" or relative dates like "Revised 3 days ago".

---

## 6. Architectural Violations Prohibited Moving Forward (Anti-Patterns)

The following items are strictly forbidden:

1. **No CSS `@extend`**: `@extend` statements in standard CSS files are invalid and will cause compile errors or get dropped by Vite. You must apply multiple CSS classes in TSX (e.g. `className="modal-content glass-panel"`) or copy-paste style rules instead.
2. **No Rogue Border Radii**: Do not use values like `10px` or `18px`. Use standard tokens: `--radius-xs` (4px), `--radius-sm` (8px), `--radius-md` (12px), or `--radius-lg` (16px).
3. **No `transition: all`**: Never declare `transition: all`. You must specify the exact properties being transitioned (e.g. `transition: background-color var(--transition-fast), border-color var(--transition-fast);`).
4. **No Hardcoded Hex Colors**: Do not specify values like `#ffffff` or `rgba(0,0,0,0.1)`. Use `var(--color-bg-secondary)` or `var(--panel-border)`. The only exception is Google-branding guidelines for the Google Sign-in button.
5. **No Inline Layout Styles**: Do not use `<div style={{ padding: '12px', display: 'flex' }}>`. Move layout code to a class within the correct layer in the feature stylesheet.
6. **No `!important`**: If you need `!important` to override a style, the CSS Layer ordering or selector specificity is broken. Correct the layer priority or select path instead of forcing override flags.
