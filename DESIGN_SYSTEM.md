# DESIGN_SYSTEM.md

## 1. Design Philosophy
- **Aesthetic Direction (Premium Glassmorphism)**: The UI actively leans into a premium, translucent glassmorphic look. Deep layered shadows, internal glow bounds, and responsive blurred backgrounds (`backdrop-filter`) define main structural elements instead of flat colors or hard borders.
- **Density & Spacing**: Generous but systematically rigid. Outer bounds use wide paddings and max-width containers, while inner components hug a strict baseline `4px` step increment system.
- **Motion Priority**: Animations exist pervasively (on hover states, focus rings, and modal mounts) but must remain performant. They prioritize hardware-accelerated transforms (`translateY`, `scale`, `opacity`) and strict easing curves to avoid introducing visual lag while maintaining a tactile feel.
- **Enforcement rules**: This system is strict. Arbitrary values outside the defined tokens (hex codes, rogue padding numbers, undocumented opacities) are strictly prohibited. 

---

## 2. Design Tokens

### 2.1 Typography
The system utilizes a fluid typography scale (implementing `clamp()`) mapped to specific sizing variables to ensure responsiveness without hardcoding break-points.

- **Typeface**: `'Inter', -apple-system, system-ui, sans-serif`
- **Scale (Fluid)**:
  - `--text-xs`: `0.75rem` (12px - Badges, labels, tags)
  - `--text-sm`: `0.875rem` (14px - Sidebar items, secondary buttons, subtopic text)
  - `--text-base`: `clamp(0.9375rem, 0.25vw + 0.875rem, 1rem)` (15px-16px - Base body text, input fields)
  - `--text-lg`: `clamp(1.125rem, 0.8vw + 0.95rem, 1.25rem)` (18px-20px - Small headings, card titles)
  - `--text-xl`: `clamp(1.375rem, 1.5vw + 1rem, 1.75rem)` (22px-28px - Primary headers, page titles)
- **Weights**:
  - `400`: Base body text
  - `500`: Interactive (buttons, navigation)
  - `600`/`700`: Structural hierarchies (titles, active states)

### 2.2 Strict Spacing Scale (4px Base)
All layout measurements (padding, margins, gaps, heights) must pull exclusively from this unit token scale. No arbitrary values (e.g. `11px`, `19px`) are allowed.

- `--space-1`: `0.25rem` (4px)
- `--space-2`: `0.5rem`  (8px)
- `--space-3`: `0.75rem` (12px)
- `--space-4`: `1rem`    (16px)
- `--space-5`: `1.25rem` (20px)
- `--space-6`: `1.5rem`  (24px)
- `--space-8`: `2rem`    (32px)
- `--space-10`: `2.5rem` (40px)

### 2.3 Semantic Color System
No raw hex values or RGB definitions may exist in component CSS logic. All styling maps permanently to defined semantic functions.

- **Interactive Primary**: `--accent`
- **Interactive States**: `--accent-hover`, `--accent-light`, `--accent-border`
- **Typographic Layers**: 
  - `--text-primary` (High contrast reading)
  - `--text-secondary` (Standard body contrast)
  - `--text-muted` (Meta data, placeholders)
- **Background Topology**:
  - `--bg-base` (Underlying application wrapper color)
  - `--bg-primary` (Root layout layer, slightly tinted by accent)
  - `--bg-secondary` (Primary structural containers, headers, modals)
  - `--bg-tertiary` (Nested cards, inputs, dense arrays)
- **Status/Priority Backgrounds**:
  - `--priority-high-bg` / `--priority-medium-bg` / `--priority-low-bg`
  - *Must always use the semantic `color` equivalent for text/borders (e.g., `--priority-high`).*

### 2.4 Border Radius
Strictly tokenized corner shaping. 

- `--radius-xs`: `4px` (Tags, small interactive icons)
- `--radius-sm`: `8px` (Inputs, buttons)
- `--radius-md`: `12px` (Cards, Menus, Modals)
- `--radius-lg`: `16px` (Large container bounds)
- `--radius-full`: `9999px` (Badges, Avatars)

### 2.5 Shadows & Glass
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`: Depth logic.
- **Glass Specifics (Mandatory for Dark Mode Containers)**:
  - Primary interactive panels: `var(--glass-bg)` with `backdrop-filter: blur(var(--glass-blur)) var(--glass-refraction)`.
  - Borders: `1px solid var(--glass-border)`.
  - Inset Highlight: `box-shadow: var(--glass-inner-glow), var(--glass-shadow);`

### 2.6 Motion
Transitions strictly limit expensive browser paints. Only properties related to `transform`, `opacity`, and `color`/`background` are to be transitioned.

- `--transition-fast`: `150ms ease` (Hover feedbacks, toggles)
- `--transition-normal`: `250ms ease` (Modal mounting)
- **Tactile Hover Standard**: Interactive primary elements (cards, buttons) utilize `transform: translateY(-1px)` or `transform: scale(1.05)` rather than excessive glow injections to maintain minimal rendering strain combined with the tactile feel.

---

## 3. Component Standards

### Buttons
- **Padding**: Use `--space-3` `--space-6` (Primary) or `--space-2` `--space-4` (Modal/Small).
- **Typography**: Strictly locked to `font-weight: 500` (sub system) or `600` (global). No arbitrary variations.
- **Corners**: Locked to `--radius-sm`. Icon-only buttons may use `--radius-xs`.
- **States**: Focus outlines must rely on `--accent-light` or `--glass-border-light` box shadows (e.g., `0 0 0 3px var(--accent-light)`).

### Containers (Cards/Modals)
- **Padding**: Inner bounds locked to `--space-6` (1.5rem).
- **Corners**: Locked to `--radius-md` (12px).
- **Backgrounds**: Must implement the `glass-panel` utility class internally to unify light/dark mode fallback structures instead of ad-hoc rgba definitions.

### Inputs
- **Base structure**: Height driven exactly by `--space-3` (0.75rem) vertical padding. Uses `--radius-sm` (8px). 
- **Focus Pattern**: `outline: none`, relying exclusively on semantic border color shifts (`border-color: var(--accent)`) and a `3px` diffuse box-shadow ring.

---

## 4. Layout Rules

- **Grid Alignment**: Standardize on `gap: var(--space-4)` or `var(--space-2)` for column separation. 
- **Alignment Rules**: Do not use pixel padding for centering. Use `display: flex; align-items: center; justify-content: center` to ensure dynamic alignment remains flawless alongside fluid typography.
- **Maximum Execution Layout**: Main views restricted to `max-width: var(--content-max-width)` (`1200px`) clamped over centered auto-margins.

---

## 5. Architectural Violations Prohibited Moving Forward

1. **No Rogue Colors**: E.g., `rgba(27, 27, 27, 0.08)` or `#1e1e24` must immediately be replaced with a tokenized mapping like `var(--bg-tertiary)`.
2. **No Orphaned Math**: E.g., `padding: 19px` is invalid; it must align to the grid, likely resolving to `var(--space-5)` (20px).
3. **Removal of Redundant Values**: Duplication of color hexes between `_tokens.css` and `theme.css` must be eradicated using mapping logic or shared references.
4. **No JS Breakpoints**: Media query calculations must be locked to design system threshold tokens rather than random numbers (e.g., not `895px`).
