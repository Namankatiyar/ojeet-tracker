---
name: ojee-tracker
description: Your Premium JEE Study Command Centre
colors:
  physics-indigo: "#6366f1"
  chemistry-emerald: "#10b981"
  maths-amber: "#f59e0b"
  bg-base-dark: "#0a0a0f"
  bg-solid-black: "#000000"
  color-backdrop: "rgba(0, 0, 0, 0.45)"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.375rem, 1.5vw + 1rem, 1.75rem)"
    fontWeight: 700
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(0.9375rem, 0.25vw + 0.875rem, 1rem)"
    fontWeight: 400
  mono:
    fontFamily: "'Montserrat', monospace"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.physics-indigo}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "#94a3b8"
    rounded: "{rounded.sm}"
---

# Design System: ojee-tracker

## 1. Overview

**Creative North Star: "The Precision Command Center"**

The visual language of ojee-tracker is grounded in high-focus, premium performance for JEE preparation. The aesthetic relies heavily on stark contrasts, precise boundaries, and immersive layers to minimize distractions while maximizing utility. Vibrant, highly saturated subject identifiers act as lighthouses against premium dark backgrounds (whether deep translucent glass or pitch black). This system explicitly rejects bloated SaaS templates, cluttered card layouts, and distracting ambient animations.

**Key Characteristics:**
- Three-mode adaptability: Light, Dark Glass, and Dark Solid (pure black).
- Sharp semantic boundaries without rogue geometries.
- Deliberate use of glassmorphism selectively for premium depth, reverting to sheer metallic borders for maximum performance.
- Motion is strictly functional (staggered cascade reveals, damped springs) rather than overly elastic.

## 2. Colors

Vibrant, highly saturated subject identifiers (Indigo, Emerald, Amber) against stark, premium dark backgrounds.

### Primary
- **Physics Indigo** (#6366f1): Core subject identifier and fallback default interactive accent.
- **Chemistry Emerald** (#10b981): Secondary subject identifier and success/mastery marker.
- **Maths Amber** (#f59e0b): Tertiary subject identifier and warning/medium-priority marker.

### Neutral
- **Base Glass** (#0a0a0f): Underlying application wrapper color in `dark-glass` mode.
- **Solid Black** (#000000): Deep base for `dark-solid` high-performance mode.
- **Text Primary** (#f1f5f9): High contrast reading for dark backgrounds.
- **Backdrop Overlay** (rgba(0, 0, 0, 0.45)): Dimming overlay for modals, date pickers, and popovers.

### Named Rules
**The Dynamic Accent Rule.** The primary interactive color (`--accent`) dynamically maps to user preference, adapting its text contrast (`#ffffff` vs `#000000`) and complementary ambient ring dynamically based on brightness.

## 3. Typography

**Display Font:** 'Inter', -apple-system, sans-serif
**Body Font:** 'Inter', -apple-system, sans-serif
**Label/Mono Font:** 'Montserrat', monospace

**Character:** Clean, readable geometric precision ensuring maximum legibility across dense data dashboards and syllabus trees.

### Hierarchy
- **Display** (700, clamp(1.375rem, 1.5vw + 1rem, 1.75rem), normal): Primary headers, page titles, and prominent dashboard metrics.
- **Title** (600, clamp(1.125rem, 0.8vw + 0.95rem, 1.25rem), normal): Section headings and card titles.
- **Body** (400, clamp(0.9375rem, 0.25vw + 0.875rem, 1rem), normal): Standard body reading and prose content.
- **Label** (500, 0.875rem, normal): Sidebar items, secondary buttons, subtopic texts.
- **Mono** (500, variable, normal): Exclusively for stopwatch and dynamic timer digits to prevent layout jittering.

### Named Rules
**The Fixed-Digit Rule.** Stopwatch displays and timer numbers must use Montserrat/monospace to prevent visual "jittering" or layout reflow when numbers increment.

## 4. Elevation

Layered and atmospheric (using glassmorphism blurs, inset glows, and deep ambient shadows in dark-glass), but strictly flat and utilitarian in dark-solid mode for performance boundaries.

### Shadow Vocabulary
- **Panel Outer Shadow** (`box-shadow: 0 4px 12px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.5)`): Grounds cards over the canvas in dark modes.
- **Floating Shadow** (`box-shadow: 0 24px 64px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)`): Used for elevated, detached floating panels like the Date Picker modal or floating settings dropdowns.
- **Inner Metallic Glow** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 20px rgba(255,255,255,0.02)`): Provides crisp edge boundaries around black elements without resorting to blurs.

### Named Rules
**The Performance-Bound Depth Rule.** Blur and glassmorphism apply only on desktop `dark-glass` layouts ($\ge$ 48rem). On mobile or `dark-solid`, drop back to sheer opacities and crisp boundaries.

## 5. Components

Tactile, precise, and confident with minimal transition states and sharp boundaries.

### Buttons
- **Shape:** Standard input elements (8px).
- **Primary:** Background uses the active subject or global accent with high-contrast text (`#ffffff` or `#000000`). Padded generously.
- **Hover / Focus:** Trigger `translateY(-1px)` and shift background to `--accent-hover`.

### Cards / Containers
- **Corner Style:** Rounded (12px).
- **Background:** `var(--panel-bg)` with conditionally applied `backdrop-filter`.
- **Shadow Strategy:** Defined strictly by `var(--panel-shadow)` and `var(--panel-inner-glow)`.
- **Border:** Driven by `var(--panel-border)` (e.g. `rgba(255, 255, 255, 0.15)`).

### Inputs / Fields
- **Style:** 8px radius, vertically padded, translucent background `rgba(0, 0, 0, 0.3)` in dark modes.
- **Focus:** Sharp border shifts (`var(--glass-border-light)`) combined with diffuse 3px glow rings.

### Checkboxes
- **Style:** Custom 18x18px square (4px radius).
- **State:** Checkmark transforms to indeterminate dash based on parent-child completion states.

## 6. Do's and Don'ts

### Do:
- **Do** map all values to standard spacing scale (`--space-1` to `--space-16`).
- **Do** leverage `.glass-panel` or `.glass-card` classes for architectural layout containers.
- **Do** write in active voice with sentence case.

### Don't:
- **Don't** use generic SaaS templates, cluttered card layouts, and distracting animations.
- **Don't** use raw Hex colors (e.g., `#ffffff`) directly in stylesheets; map them strictly via `var(--color-...)`.
- **Don't** use rogue border radii like `10px` or `18px`. Stick to the tokens (4, 8, 12, 16).
- **Don't** apply `transition: all`; state exactly what is transitioning to protect browser paint performance.
- **Don't** utilize `@extend` inside CSS files. Use composition via multiple TSX class names.
