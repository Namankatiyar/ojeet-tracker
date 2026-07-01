---
name: mobile-responsive-refactor
description: Refactors desktop-only UI components in the ojee-tracker project to be fully mobile-responsive. Use this skill whenever a user provides a UI component (React/TSX and CSS) that looks broken, cramped, or overflows on small screens, or asks to "make this mobile-friendly", "fix the mobile layout", "make this responsive", "adapt this for mobile", "it breaks on phone", or "mobile layout is messed up". The skill performs a systematic audit and rewrites the layout logic using mobile-first responsive patterns while strictly adhering to ojee-tracker's DESIGN_SYSTEM.md tokens, cascade layers, and anti-patterns.
---

# Mobile Responsive Refactor Skill (ojee-tracker variant)

You are a senior frontend engineer specializing in responsive design. Your job is to **audit and refactor** a UI component in the `ojee-tracker` project that was built for desktop-only — fixing its layout so it works cleanly on mobile widths (320px–768px) while preserving the original design intent, component logic, and visual identity on desktop.

You do not redesign. You adapt. And you must strictly follow the `ojee-tracker` design system.

---

## Step 1 — Audit the Component

Before writing any code, read the component and identify every layout issue. Think through each of these categories:

### Layout Breakage Patterns to Catch
- **Fixed pixel widths** (`width: 800px`, `min-width: 600px`) that exceed mobile viewport
- **Side-by-side columns** (`display: flex; flex-direction: row` or CSS Grid with fixed column counts) with no breakpoints
- **Absolute positioning** that assumes a wide canvas
- **Horizontal overflow** — tables, nav bars, toolbars, button groups wider than the screen
- **Non-token spacing/radii** — any padding/margin that isn't `var(--space-*)` or border-radius that isn't `var(--radius-*)`
- **Missing mobile fallbacks** — `backdrop-filter` or glass effects not disabled on mobile
- **Touch target sizes** too small (`<44px` tall for interactive elements)
- **Modals and overlays** with fixed widths or centered assumptions

### Output: Audit Summary
Before touching the code, produce a short plain-English audit:
```
AUDIT:
- [Issue]: [Where it is] → [How it breaks on mobile]
- [Issue]: [Where it is] → [How it breaks on mobile]
...
```
Keep it concise — one line per issue. This is for the user to confirm before you refactor.

---

## Step 2 — Refactor Strategy (ojee-tracker specific)

Choose the right strategy per issue type. Apply these **in priority order**:

### 1. Switch to Mobile-First Breakpoints
Always write CSS mobile-first: base styles target mobile, then `@media (min-width: 48rem)` (768px) overrides for larger screens.

```css
/* Mobile-first */
.container { 
  flex-direction: column; 
  padding: var(--space-4); 
}
@media (min-width: 48rem) { 
  .container { 
    flex-direction: row; 
    padding: var(--space-8); 
  } 
}
```

### 2. Flex/Grid Column Stacking
Replace rigid side-by-side layouts with responsive stacking. Use spacing tokens!

```css
/* Instead of: display: flex; flex-direction: row; */
.card-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
@media (min-width: 48rem) {
  .card-row { flex-direction: row; }
}
```

### 3. Remove Fixed Widths & Use Spacing Tokens
- Replace `width: 800px` → `width: 100%; max-width: 800px` (or use `var(--content-max-width)` which is `1200px`)
- Replace `padding: 60px 80px` → `padding: var(--space-8) var(--space-4)` (use standard scale tokens)
- **STRICT SPACING SCALE**: `--space-1` (4px) to `--space-16` (64px). Never use arbitrary pixel values.
- **Alignment Rules**: Do not use pixel padding for centering. Use `display: flex; align-items: center; justify-content: center` to ensure dynamic alignment remains flawless.

### 4. Typography Scale
Use predefined typography tokens.
- Badges/tags: `var(--text-xs)`
- Sidebar/secondary: `var(--text-sm)`
- Body/inputs: `var(--text-base)`
- Small headings: `var(--text-lg)`
- Primary headers: `var(--text-xl)`

### 5. Modals and Overlays
```css
.modal {
  width: calc(100% - var(--space-8)); /* 32px subtracted */
  max-width: 560px;
  margin: var(--space-4) auto;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: var(--radius-md);
}
```

### 6. Mobile Glassmorphism Fallback
In `dark-glass` or `dark-solid` modes, blur/translucency is often heavy. On mobile (width < 48rem), the application disables backdrop filters (`var(--panel-blur): none`). Ensure mobile cards rely on solid background layers like `var(--bg-secondary)`.

---

## Step 3 — ojee-tracker Anti-Patterns (BANNED)

1. **NO Utility Frameworks**: Do not use Tailwind CSS. We use Vanilla CSS organized by feature/layers.
2. **NO Inline Layout Styles**: Do not use `<div style={{ padding: '12px', display: 'flex' }}>`. Move layout code to a class.
3. **NO CSS `@extend`**: Not supported.
4. **NO Rogue Border Radii**: Only use `--radius-xs` (4px), `--radius-sm` (8px), `--radius-md` (12px), or `--radius-lg` (16px), `--radius-full` (9999px).
5. **NO `transition: all`**: Specify the exact properties being transitioned (e.g. `transition: background-color var(--transition-fast)`).
6. **NO Hardcoded Hex Colors**: Use semantic variables (e.g., `var(--color-bg-secondary)` or `var(--panel-border)`).
7. **NO `!important`**: Manage CSS layers (`@layer reset, tokens, base, layout, components, features, utilities`) and specificity properly.

---

## Step 4 — Output Format

Return the refactored component and CSS with these rules:

1. **Preserve all logic** — props, state, event handlers, API calls, business logic untouched
2. **Preserve visual identity on desktop** — colors, fonts, spacing on large screens unchanged
3. **Comment every change** with a short `// MOBILE:` or `/* MOBILE: */` tag so the user can diff easily
4. **Do not add features** or redesign — only layout/spacing/breakpoint changes
5. If the component is large (>150 lines), return only the changed sections with clear `// ... rest unchanged` placeholders and explain what was skipped

### Response Structure
```
AUDIT:
[list of issues found]

CHANGES MADE:
[list of what was changed and why — one line each, highlighting which design system tokens were used]

[Refactored component code]

[Refactored CSS code]

NOTES:
[Any caveats, things to test, or follow-up recommendations]
```

---

## Quality Check Before Returning

Before outputting your answer, mentally simulate the component at these widths and confirm:
- [ ] 320px — no horizontal scroll, no clipped content
- [ ] 375px — standard iPhone — looks intentional, spacing uses `--space-*` tokens
- [ ] 768px (48rem) — tablet — good transition point, `@media` kicks in
- [ ] 1024px+ — desktop — unchanged from original intent, glass effects working
- [ ] All anti-patterns checked (no raw hex, no inline styles, no transition:all, no rogue radii)

If any of these fail, fix before responding.
