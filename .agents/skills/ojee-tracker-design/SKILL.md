---
name: ojee-tracker-design
description: Governs the premium glassmorphism visual language, colors, typography, layout grid, component patterns, and animations in the ojee-tracker project. Use when the user asks to design, style, or edit UI elements, buttons, cards, modals, themes, or layouts, or mentions files in src/styles/ or src/components/.
---

# ojee-tracker Design System Skill

This document is the canonical visual design specification and style contract for the **ojee-tracker** codebase. Any AI coding session performing UI modifications, styling, or creating new frontend components must strictly adhere to these rules.

---

## 1. Project Identity

`ojee-tracker` is an offline-first, high-focus JEE/OJEE syllabus tracker and study planner. The interface is optimized to minimize cognitive load and provide an immersive, premium workspace for students. 
- **Aesthetic Direction**: Premium translucent glassmorphism in dark mode (layered shadows, internal glowing boundaries, and blurred backdrop refractions) and clean card surfaces in light mode.
- **Dynamic Adaptability**: The interface supports a dynamic accent color engine. Users can pick a custom accent color, which is saved in local storage. The application then dynamically shifts the color's hue by 60 degrees to compute a complementary secondary accent, updates the PWA theme, and recalculates text contrast boundaries (switching text between `#ffffff` and `#000000` depending on accent brightness).
- **Responsive Performance**: On desktop (viewport width $\ge$ 48rem), the application shows full glassmorphism, blur refractions, and fixed side sections. On mobile (viewport width < 48rem), glassmorphism falls back to solid background layers (`var(--bg-secondary)`) to avoid GPU scrolling lag.

---

## 2. Color Tokens

Never write raw hex or RGB values directly in component styles. All styling must pull from the custom properties defined in `@layer tokens` (within [src/styles/layers/_tokens.css](file:///home/naman/Documents/ojee-tracker/src/styles/layers/_tokens.css)).

### 2.1 Background Topology
| Name | CSS Variable | Resolved Light Hex | Resolved Dark Hex |
| :--- | :--- | :--- | :--- |
| **Base Background** | `--color-bg-base` | `#f8fafc` | `#0a0a0f` |
| **Primary Background** | `--color-bg-primary` | `color-mix(...)` (accent + base 96%) | `color-mix(...)` (accent + base 95%) |
| **Secondary Background** | `--color-bg-secondary` | `#ffffff` | `rgba(18, 18, 26, 0.35)` |
| **Tertiary Background** | `--color-bg-tertiary` | `#f1f5f9` | `rgba(26, 26, 40, 0.5)` |

### 2.2 Text Hierarchy
| Name | CSS Variable | Resolved Light Hex | Resolved Dark Hex |
| :--- | :--- | :--- | :--- |
| **Primary Text** | `--color-text-primary` | `#0f172a` | `#f1f5f9` |
| **Secondary Text** | `--color-text-secondary` | `#475569` | `#94a3b8` |
| **Muted Text** | `--color-text-muted` | `#94a3b8` | `#64748b` |

### 2.3 Borders
| Name | CSS Variable | Resolved Light Hex | Resolved Dark Hex |
| :--- | :--- | :--- | :--- |
| **Default Border** | `--color-border` | `#e2e8f0` | `rgba(255, 255, 255, 0.08)` |
| **Hover Border** | `--color-border-hover` | `#cbd5e1` | `rgba(255, 255, 255, 0.15)` |

### 2.4 Accent System (Dynamic)
Accent tokens are dynamically written to the `:root` element by the theme provider. Always use the following semantic mappings:
- `--accent`: Primary interactive color (defaults to `#f59e0b` amber or `#06b6d4` cyan).
- `--accent-hover`: 10% darkened variant for hover feedback.
- `--accent-light`: Translucent tint (10-15% opacity) for active list items or highlights.
- `--accent-text`: Calculated high-contrast text color (`#ffffff` or `#000000`) based on accent brightness.
- `--accent-border`: Border styling wrapping interactive elements (becomes `var(--border)` if the accent is too bright).
- `--secondary-accent`: Hue-shifted complementary accent used for ambient background gradients.

### 2.5 Subject & Priority Semantics
- **Subject Colors**:
  - Physics: `var(--color-physics)` $\rightarrow$ `#6366f1` (Indigo)
  - Chemistry: `var(--color-chemistry)` $\rightarrow$ `#10b981` (Emerald)
  - Mathematics: `var(--color-maths)` $\rightarrow$ `#f59e0b` (Amber)
- **Priority/Confidence Levels**:
  - High Priority / Level 1 Confidence: `var(--color-priority-high)` $\rightarrow$ `#ef4444` (Red), BG: `var(--color-priority-high-bg)`
  - Medium Priority / Level 2 Confidence: `var(--color-priority-medium)` $\rightarrow$ `#f59e0b` (Amber), BG: `var(--color-priority-medium-bg)`
  - Low Priority / Level 3 Confidence: `var(--color-priority-low)` $\rightarrow$ `#22c55e` (Green), BG: `var(--color-priority-low-bg)`
  - Level 4 Confidence (Purple): `var(--color-confidence-purple)` $\rightarrow$ `#8b5cf6`
  - Level 5 Confidence (Green/Mastered): `var(--color-confidence-green)` $\rightarrow$ `#22c55e`

---

## 3. Typography Rules

Fluid typography scales are utilized in headings to ensure responsive fitting without sudden break-point shifts.

- **Primary Typeface Stack**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Timer/Digits Monospace Stack**: `'Montserrat', monospace`
  > [!IMPORTANT]
  > Stopwatch displays and timer numbers must use Montserrat/monospace to prevent visual "jittering" or layout reflow when numbers increment.
- **Fluid Font Sizes (clamped)**:
  - `--text-xs`: `clamp(0.7rem, 0.65vw + 0.5rem, 0.75rem)` (Metadata, subtopic tags)
  - `--text-sm`: `clamp(0.8rem, 0.75vw + 0.6rem, 0.875rem)` (Navigation labels, subtopic headers)
  - `--text-base`: `clamp(0.9375rem, 1vw + 0.75rem, 1rem)` (Default body text, inputs)
  - `--text-lg`: `clamp(1.125rem, 1.25vw + 0.8rem, 1.25rem)` (Small headers, card titles)
  - `--text-xl`: `clamp(1.25rem, 1.5vw + 1rem, 1.5rem)` (Main page titles, primary headers)
- **Font Weight Conventions**:
  - `400`: Regular body reading and secondary copy.
  - `500`: Interactive navigation, buttons, and custom select labels.
  - `600`/`700`: Layout headings, active nav items, and primary actions.

---

## 4. Spacing & Layout Contract

We run on a strict **4px baseline grid**. Do not introduce rogue numbers (e.g. `11px`, `19px`, `13px`) for spacing or positioning.

### 4.1 Grid Increments
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

### 4.2 Standard Layout Boundaries
- **Page Wrapper Margin**: Auto-centered horizontally, restricted to `max-width: var(--content-max-width)` (`1200px`) or `--content-max-width-wide` (`1400px` for dense planners).
- **Core Padding**:
  - Page shells: `padding: var(--space-8)` on desktop; `padding: var(--space-4)` on mobile.
  - Modals and Card surfaces: `padding: var(--space-6)` (`1.5rem` / 24px).
  - List items: `gap: var(--space-4)` or `var(--space-2)`.

---

## 5. CSS Layer Architecture

All styles are organized into Cascade Layers. This controls precedence and resolves specificity conflicts.

```css
/* Declared once in src/styles/index.css */
@layer reset, tokens, base, layout, components, features, utilities;
```

1. **`reset`** ([src/styles/layers/_reset.css](file:///home/naman/Documents/ojee-tracker/src/styles/layers/_reset.css)): Global CSS reset, padding zeroing, borders box-sizing.
2. **`tokens`** ([src/styles/layers/_tokens.css](file:///home/naman/Documents/ojee-tracker/src/styles/layers/_tokens.css)): CSS Custom Properties for colors, radii, shadows, and base scaling.
3. **`base`** ([src/styles/base.css](file:///home/naman/Documents/ojee-tracker/src/styles/base.css)): Global element styles (`body`, `html`), scrollbar customization, and ambient radial gradients.
4. **`layout`** ([src/styles/layout.css](file:///home/naman/Documents/ojee-tracker/src/styles/layout.css)): Header structure, fixed nav blocks, persistent layouts, and responsiveness shell.
5. **`components`** ([src/styles/components/](file:///home/naman/Documents/ojee-tracker/src/styles/components/)):
   - `ui.css`: Buttons, checkboxes, indicator bubbles, loader circles.
   - `glass.css`: Defines `.glass-panel`, `.glass-interactive`, `.glass-card` classes.
   - `modals.css`: Global overlays, backdrop animations, and inputs.
   - `misc.css`: DatePicker wrappers, custom popups, and dropdown menus.
6. **`features`** ([src/styles/features/](file:///home/naman/Documents/ojee-tracker/src/styles/features/)): Feature-specific code (`dashboard.css`, `subjects.css`, `planner.css`, `study-clock.css`).
7. **`utilities`**: Screen reader utility (`.sr-only`), dynamic flex utilities (`.flex`, `.items-center`), and font overrides.

> [!WARNING]
> Never write styles outside of a cascade layer. Styles written outside of a layer will override layer-defined rules unconditionally, disrupting cascade hierarchy.

---

## 6. Component Conventions

### 6.1 Buttons
- **Primary Button (`.primary-btn`)**:
  - Background is `var(--accent)`, text is `var(--accent-text)`.
  - Border uses `var(--accent-border)` to guarantee high contrast.
  - Hover triggers `background: var(--accent-hover)` and `transform: translateY(-1px)`.
  - Disabled uses `opacity: 0.5; cursor: not-allowed; pointer-events: none;`.
- **Secondary Button (`.secondary-btn`)**:
  - Background is transparent, border is `1px solid var(--border)`.
  - Hover shifts background to `var(--bg-tertiary)` and border-color to `var(--text-secondary)`.
- **Small Icon Button (`.icon-btn-small`)**:
  - Height & Width: `24px` (or `var(--space-6)`).
  - Border radius is strictly `var(--radius-xs)` (4px). *Do not write raw `4px`.*
  - Hover swaps background to `var(--accent)` and text color to white.

### 6.2 Inputs & Custom Selects
- **Inputs and Textareas**:
  - Vertically sized using `padding: var(--space-3)` (`0.75rem`).
  - Dark mode backgrounds must be translucent: `background: rgba(0, 0, 0, 0.3)`.
  - Focus state: `outline: none`, swapping borders to `var(--glass-border-light)` (dark mode) or `var(--accent)` (light mode) with a diffuse `3px` box shadow ring.
- **Custom Select (`.custom-select-container`)**:
  - Uses absolute positioning for popover options list (`.custom-select-options`).
  - Options list implements glassmorphism in dark mode (`@layer components` via `.glass-panel`).
  - Highlight states map to priority classes (`.priority-high`, `.priority-medium`, etc.).

### 6.3 Checkboxes
- **Checkbox Container (`.checkbox-container`)**:
  - Custom span checkmark: `.checkmark` using `width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--border);`.
  - Active checked style: `background: var(--accent); border-color: var(--accent);` rendering checkmark character `✓`.
  - Indeterminate State (`.checkbox-container.indeterminate`):
    - Input `indeterminate` attribute toggled in JS.
    - Checkmark symbol changes to a horizontal dash `-` or partial block.

### 6.4 Cards & Surfaces
- **Aesthetic Definition**: Must apply `.glass-panel` or `.glass-card` classes.
- **Glass Panel Structure**:
  - Background: `var(--panel-bg)`
  - Backdrop blur: `var(--panel-blur)` (resolves to `none` in light mode, dynamic `blur()` in dark mode).
  - Highlight Ring: `box-shadow: var(--panel-inner-glow), var(--panel-shadow)`.
- **Performance boundary**: Mobile layouts discard blur properties. Ensure cards fall back to opaque `var(--bg-secondary)` below the `48rem` media breakpoint.

### 6.5 Chapter Workspace Drawer (`.chapter-drawer`)
- Slides out from the right using an absolute modal overlay.
- Contains:
  - Header with serial and chapter title.
  - Confidence range input (`.confidence-slider`) colored dynamically by the confidence levels.
  - Steppers with Plus/Minus buttons for attempted questions and revision counts, alongside a reset button (`X` icon) to quickly reset values.
  - Subtopics grid displaying NCERT, PYQ, and Module check states side-by-side with question tallies.
  - Revision log showing relative date strings, a "Mark Today" shortcut, and a reset date button.

---

## 7. Animation Contract

We animate sparingly to preserve system performance, targeting only GPU-friendly composition properties.

### 7.1 Allowed Animation Properties
- `opacity`
- `transform` (specifically `translateY`, `scale`)
- `color`, `background-color`, `border-color`, `box-shadow` (for color morphing)
- *Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` as these trigger layout paint reflow.*

### 7.2 Easing & Timings
- Fast interactions (hovers, checkboxes, menu items): `150ms ease` (`var(--transition-fast)`).
- Normal transitions (drawers, modals, card list additions): `250ms ease` (`var(--transition-normal)`).
- Ambient entry (background image loads, sync alerts): `400ms ease` (`var(--transition-slow)`).

### 7.3 Reduced Motion Control
All animations and keyframes must respect system-level preferences. Always wrap custom transitions in a media query:

```css
@media (prefers-reduced-motion: reduce) {
    *,
    ::before,
    ::after {
        animation-delay: -1ms !important;
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        background-attachment: initial !important;
        scroll-behavior: auto !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
    }
}
```

---

## 8. Anti-Patterns (Banned Style Operations)

The following items are strictly forbidden. Code reviews will reject these on sight:

- **No CSS `@extend`**: `@extend` statements in standard CSS files are invalid and will cause compile errors or get dropped by Vite. You must apply multiple CSS classes in TSX (e.g. `className="modal-content glass-panel"`) or copy-paste style rules instead of using `@extend`.
- **No Rogue Border Radii**: Do not use values like `10px` or `18px`. Use standard tokens: `--radius-xs` (4px), `--radius-sm` (8px), `--radius-md` (12px), or `--radius-lg` (16px).
- **No transition: all**: Never declare `transition: all`. You must specify the exact properties being transitioned (e.g. `transition: background-color var(--transition-fast), border-color var(--transition-fast);`).
- **No Hardcoded Hex Colors**: Do not specify values like `#ffffff` or `rgba(0,0,0,0.1)`. Use `var(--color-bg-secondary)` or `var(--panel-border)`. The only exception is google-branding guidelines for the Google Sign-in button.
- **No Inline Layout Styles**: Do not use `<div style={{ padding: '12px', display: 'flex' }}>`. Move layout code to a class within the correct layer in the feature stylesheet.
- **No `!important`**: If you need `!important` to override a style, the CSS Layer ordering or selector specificity is broken. Correct the layer priority or select path instead of forcing override flags.

---

## 9. Copy & Microcopy Rules

Consistency in copy preserves the clean utility of the tracker workspace.

- **Case Convention**: Always use **Sentence case** for titles, headings, fields, and button labels (e.g., "Mark today", "Clear revision date", "Study materials"). Avoid Title Case ("Mark Today") or UPPERCASE ("DELETE") unless required by standard branding.
- **Confidence Rating Labels**:
  - Level 1: "1 - Need Help"
  - Level 2: "2 - Low"
  - Level 3: "3 - Medium"
  - Level 4: "4 - High"
  - Level 5: "5 - Mastered"
- **Revision Relative Time**:
  - Show "Never" when `lastRevised` is null or undefined.
  - Show "Revised today" or relative dates like "Revised 3 days ago".
- **Action Verbs**: Keep button labels short and active: "Mark Today", "Clear", "Delete", "Add task".

---

## 10. Quality Checklist

Run this checklist before completing any frontend task:

- [ ] **No Raw Hex Codes**: Ensure all colors match CSS variables (`var(--...)`) instead of raw hex values.
- [ ] **No CSS Modules**: Ensure styles are placed in global CSS layers, importing them in `src/styles/index.css`.
- [ ] **No `@extend`**: Double check that no `@extend` statements are present in CSS files.
- [ ] **No `transition: all`**: Ensure all transitions explicitly specify transitioned properties.
- [ ] **Mobile Opaque Fallbacks**: Test that cards fall back to solid background layers (`var(--bg-secondary)`) under `48rem` viewport width.
- [ ] **Focus Rings**: Verify that every custom input, select, and button has a visible focus state defined using `box-shadow` or `outline`.
- [ ] **Monospace Digits**: Verify Montserrat/monospace is used for stopwatch displays to prevent text jitter.
- [ ] **Sentence Case**: Ensure new UI buttons, labels, and text descriptions are written in Sentence case.
- [ ] **Banned Radii Removed**: Ensure no rogue radii (e.g. `10px`, `18px`) are introduced; use `--radius-sm` (8px) or `--radius-md` (12px).
- [ ] **Grid Conformance**: Ensure spacing values pull from `--space-*` tokens.
