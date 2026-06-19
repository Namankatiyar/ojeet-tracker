---
name: ojee-tracker-design
description: Governs the premium glassmorphism visual language, colors, typography, layout grid, component patterns, and animations in the ojee-tracker project. Use when the user asks to design, style, or edit UI elements, buttons, cards, modals, themes, or layouts, or mentions files in src/styles/ or src/components/.
---

# ojee-tracker Design System & Frontend Design Philosophy

This document merges the visual design specifications for **ojee-tracker** with our studio's opinionated frontend design philosophy. Adhere to these principles and specifications during any UI styling, layout modification, component creation, or copywriting task in this codebase.

---

## 1. Design Philosophy: Grounded in the Subject

`ojee-tracker` is an offline-first, high-focus JEE/OJEE syllabus tracker and study planner designed for students preparing for one of the most demanding exams. 
- **The Subject & Context**: The exam preparation journey is a high-stakes, long-term marathon. The interface must not feel like a casual app or a generic SaaS dashboard. It must feel like an immersive, high-performance instrument or workspace—a premium dashboard that helps students focus, track, and execute.
- **Aesthetic Direction**: Premium translucent glassmorphism in dark mode (layered shadows, internal glowing boundaries, and blurred backdrop refractions) and clean card surfaces in light mode. This provides depth and focus, evoking a professional dark IDE or high-end laboratory terminal.
- **Dynamic Adaptability**: The interface supports a dynamic accent color engine. Users can pick a custom accent color, which is saved in local storage. The application then dynamically shifts the color's hue by 60 degrees to compute a complementary secondary accent, updates the PWA theme, and recalculates text contrast boundaries (switching text between `#ffffff` and `#000000` depending on accent brightness).
- **Responsive Performance**: On desktop (viewport width $\ge$ 48rem), the application shows full glassmorphism, blur refractions, and fixed side sections. On mobile (viewport width < 48rem), glassmorphism falls back to solid background layers (`var(--bg-secondary)`) to avoid GPU scrolling lag.

---

## 2. Design Principles

### 2.1 The Hero is a Thesis
Open pages or sections with the most characteristic element in the subject's world. Avoid generic dashboard templates (like a large number, small label, and gradient accent) unless it is genuinely the most effective choice. Instead, lead with visual thesis statements—for example, the countdown timer to the exam date, a live study clock, or a clear visual completion ring.

### 2.2 Typography with Personality
Typography carries the personality of the page. Pair the display and body faces deliberately:
- **Primary Typeface Stack**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` for clean readability.
- **Timer/Digits Monospace Stack**: `'Montserrat', monospace`
  > [!IMPORTANT]
  > Stopwatch displays and timer numbers must use Montserrat/monospace to prevent visual "jittering" or layout reflow when numbers increment.

Make the type treatment itself a memorable part of the design. Set a clear type scale with intentional weights, widths, and spacing:
- **Fluid Font Sizes (clamped)**:
  - `--text-xs`: `0.75rem` (12px - Badges, labels, tags)
  - `--text-sm`: `0.875rem` (14px - Sidebar items, secondary buttons, subtopic text)
  - `--text-base`: `clamp(0.9375rem, 0.25vw + 0.875rem, 1rem)` (15px-16px - Base body text, input fields)
  - `--text-lg`: `clamp(1.125rem, 0.8vw + 0.95rem, 1.25rem)` (18px-20px - Small headings, card titles)
  - `--text-xl`: `clamp(1.375rem, 1.5vw + 1rem, 1.75rem)` (22px-28px - Primary headers, page titles)
- **Font Weight Conventions**:
  - `400`: Regular body reading and secondary copy.
  - `500`: Interactive navigation, buttons, and custom select labels.
  - `600`/`700`: Layout headings, active nav items, and primary actions.

### 2.3 Structure is Information
Structural devices, numbering, dividers, and labels should encode something true about the content. 
- Avoid arbitrary numbered markers (e.g., `01 / 02 / 03` for decor) unless the content represents a strict sequence (like step-by-step revision stages or chronological study milestones).
- Use spacing, grid dividers, and subtopic status dots to reveal progress structure (e.g., NCERT, PYQs, Modules) rather than decoration.

### 2.4 Leverage Motion Deliberately
Animate sparingly to serve the student's focus and preserve system performance, targeting only GPU-friendly composition properties.
- Use orchestrated moments (e.g., a completion celebration, a countdown tick transition, a sidebar drawer reveal) rather than scattered effects.
- Avoid over-animating, which contributes to the feeling that a design is templated or AI-generated.

### 2.5 Restraint: Spend Boldness in One Place
Let a single signature element be the memorable aspect of each interface (e.g., the Chapter Workspace drawer with its dynamic confidence slider, or the countdown-integrated study clock). Keep everything around it quiet, disciplined, and functional. Cut decorative elements that do not serve the brief.

---

## 3. Two-Pass Design Process

Before implementing new layouts or UI elements, work in two distinct passes:
1. **Pass 1: Brainstorm & Plan**:
   - Establish a compact token system mapping color, type, layout, and signature.
   - Propose an ASCII wireframe or prose layout.
   - Identify the signature element representing the subject.
2. **Pass 2: Default Review & Critique**:
   - Review the plan against default AI designs (e.g., cream/serif/terracotta, black/acid-green, or broadsheet/hairline rules). Unless explicitly requested, avoid these defaults.
   - Refine selector specificities to prevent CSS classes from canceling each other out (particularly with type selectors like `.section` vs. `.cta`).
   - Iterate in your thinking first and present high-confidence ideas to the user.

---

## 4. Spacing & Layout Contract

We run on a strict **4px baseline grid**. Do not introduce rogue numbers (e.g., `11px`, `13px`, `19px`) for spacing or positioning.

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

## 5. Color Tokens

Never write raw hex or RGB values directly in component styles. All styling must pull from the custom properties defined in `@layer tokens` (within [src/styles/layers/_tokens.css](file:///home/naman/Documents/ojee-tracker/src/styles/layers/_tokens.css)).

### 5.1 Background Topology
| Name | CSS Variable | Resolved Light Hex | Resolved Dark Hex |
| :--- | :--- | :--- | :--- |
| **Base Background** | `--color-bg-base` | `#f8fafc` | `#0a0a0f` |
| **Primary Background** | `--color-bg-primary` | `color-mix(...)` (accent + base 96%) | `color-mix(...)` (accent + base 95%) |
| **Secondary Background** | `--color-bg-secondary` | `#ffffff` | `rgba(18, 18, 26, 0.35)` |
| **Tertiary Background** | `--color-bg-tertiary` | `#f1f5f9` | `rgba(26, 26, 40, 0.5)` |

### 5.2 Text Hierarchy
| Name | CSS Variable | Resolved Light Hex | Resolved Dark Hex |
| :--- | :--- | :--- | :--- |
| **Primary Text** | `--color-text-primary` | `#0f172a` | `#f1f5f9` |
| **Secondary Text** | `--color-text-secondary` | `#475569` | `#94a3b8` |
| **Muted Text** | `--color-text-muted` | `#94a3b8` | `#64748b` |

### 5.3 Borders
| Name | CSS Variable | Resolved Light Hex | Resolved Dark Hex |
| :--- | :--- | :--- | :--- |
| **Default Border** | `--color-border` | `#e2e8f0` | `rgba(255, 255, 255, 0.08)` |
| **Hover Border** | `--color-border-hover` | `#cbd5e1` | `rgba(255, 255, 255, 0.15)` |

### 5.4 Accent System (Dynamic)
Accent tokens are dynamically written to the `:root` element by the theme provider. Always use the following semantic mappings:
- `--accent`: Primary interactive color (defaults to `#f59e0b` amber or `#06b6d4` cyan).
- `--accent-hover`: 10% darkened variant for hover feedback.
- `--accent-light`: Translucent tint (10-15% opacity) for active list items or highlights.
- `--accent-text`: Calculated high-contrast text color (`#ffffff` or `#000000`) based on accent brightness.
- `--accent-border`: Border styling wrapping interactive elements (becomes `var(--border)` if the accent is too bright).
- `--secondary-accent`: Hue-shifted complementary accent used for ambient background gradients.

### 5.5 Subject & Priority Semantics
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

## 6. CSS Layer Architecture

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

## 7. Component Conventions

### 7.1 Buttons
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

### 7.2 Inputs & Custom Selects
- **Inputs and Textareas**:
  - Vertically sized using `padding: var(--space-3)` (`0.75rem`).
  - Dark mode backgrounds must be translucent: `background: rgba(0, 0, 0, 0.3)`.
  - Focus state: `outline: none`, swapping borders to `var(--glass-border-light)` (dark mode) or `var(--accent)` (light mode) with a diffuse `3px` box shadow ring.
- **Custom Select (`.custom-select-container`)**:
  - Uses absolute positioning for popover options list (`.custom-select-options`).
  - Options list implements glassmorphism in dark mode (`@layer components` via `.glass-panel`).
  - Highlight states map to priority classes (`.priority-high`, `.priority-medium`, etc.).

### 7.3 Checkboxes
- **Checkbox Container (`.checkbox-container`)**:
  - Custom span checkmark: `.checkmark` using `width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--border);`.
  - Active checked style: `background: var(--accent); border-color: var(--accent);` rendering checkmark character `✓`.
  - Indeterminate State (`.checkbox-container.indeterminate`):
    - Input `indeterminate` attribute toggled in JS.
    - Checkmark symbol changes to a horizontal dash `-` or partial block.

### 7.4 Cards & Surfaces
- **Aesthetic Definition**: Must apply `.glass-panel` or `.glass-card` classes.
- **Glass Panel Structure**:
  - Background: `var(--panel-bg)`
  - Backdrop blur: `var(--panel-blur)` (resolves to `none` in light mode, dynamic `blur()` in dark mode).
  - Highlight Ring: `box-shadow: var(--panel-inner-glow), var(--panel-shadow)`.
- **Performance boundary**: Mobile layouts discard blur properties. Ensure cards fall back to opaque `var(--bg-secondary)` below the `48rem` media breakpoint.

### 7.5 Chapter Workspace Drawer (`.chapter-drawer`)
- Slides out from the right using an absolute modal overlay.
- Contains:
  - Header with serial and chapter title.
  - Confidence range input (`.confidence-slider`) colored dynamically by the confidence levels.
  - Steppers with Plus/Minus buttons for attempted questions and revision counts, alongside a reset button (`X` icon) to quickly reset values.
  - Subtopics grid displaying NCERT, PYQ, and Module check states side-by-side with question tallies.
  - Revision log showing relative date strings, a "Mark Today" shortcut, and a reset date button.

---

## 8. Animation Contract

### 8.1 Allowed Animation Properties
- `opacity`
- `transform` (specifically `translateY`, `scale`)
- `color`, `background-color`, `border-color`, `box-shadow` (for color morphing)
- *Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` as these trigger layout paint reflow.*

### 8.2 Easing & Timings
- Fast interactions (hovers, checkboxes, menu items): `150ms ease` (`var(--transition-fast)`).
- Normal transitions (drawers, modals, card list additions): `250ms ease` (`var(--transition-normal)`).
- Ambient entry (background image loads, sync alerts): `400ms ease` (`var(--transition-slow)`).

### 8.3 Reduced Motion Control
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

## 9. Writing & Microcopy Rules

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

## 10. Anti-Patterns (Banned Style Operations)

The following items are strictly forbidden:
- **No CSS `@extend`**: `@extend` statements in standard CSS files are invalid and will cause compile errors or get dropped by Vite. You must apply multiple CSS classes in TSX (e.g. `className="modal-content glass-panel"`) or copy-paste style rules instead of using `@extend`.
- **No Rogue Border Radii**: Do not use values like `10px` or `18px`. Use standard tokens: `--radius-xs` (4px), `--radius-sm` (8px), `--radius-md` (12px), or `--radius-lg` (16px).
- **No transition: all**: Never declare `transition: all`. You must specify the exact properties being transitioned (e.g. `transition: background-color var(--transition-fast), border-color var(--transition-fast);`).
- **No Hardcoded Hex Colors**: Do not specify values like `#ffffff` or `rgba(0,0,0,0.1)`. Use `var(--color-bg-secondary)` or `var(--panel-border)`. The only exception is Google-branding guidelines for the Google Sign-in button.
- **No Inline Layout Styles**: Do not use `<div style={{ padding: '12px', display: 'flex' }}>`. Move layout code to a class within the correct layer in the feature stylesheet.
- **No `!important`**: If you need `!important` to override a style, the CSS Layer ordering or selector specificity is broken. Correct the layer priority or select path instead of forcing override flags.

---

## 11. Quality Checklist

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
