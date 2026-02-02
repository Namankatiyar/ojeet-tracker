# OJEE Tracker: Technical Project Overview

This documentation provides an exhaustive technical analysis of the OJEE Tracker project. It is designed to empower LLM-based agents with the full context required for complex coding tasks, including feature implementation, bug fixing, and UI/UX enhancements.

**Last Updated:** 2026-02-02

---

## 1. Project Essence & Objective

**OJEE Tracker** is a high-performance, offline-first progress tracking application specifically optimized for academic preparation. It solves the problem of tracking granular completion across multiple subjects (Physics, Chemistry, Maths) and diverse study materials (NCERT, PyQs, Modules, etc.).

### Key Philosophies:
- **Visual-First Progress**: Immediate feedback through rings, bars, and confetti.
- **Extreme Flexibility**: Users can modify the syllabus, add/remove resource columns, and reorder content.
- **Deep Persistence**: Leveraging `localStorage` for a zero-server, instant-load experience.
- **Integrated Toolset**: Combines syllabus tracking with a daily/monthly planner (featuring Shift+Drag duplication) and a dedicated study clock.
- **Hybrid Time Tracking**: Supports both real-time stopwatch tracking and manual log entry for offline study sessions.
- **Unified Actions**: Deep integration between the Study Clock and Planner, allowing users to "Mark Complete" a task directly from the timer interface.
- **Personalized Appearance**: High degree of UI customization, including custom background wallpapers, adjustable background dimming, and real-time glassmorphism intensity control.
- **Intelligent Theming**: Automatic accent color extraction from custom wallpapers using `node-vibrant` for a cohesive look.
- **Context-Aware UI**: Sophisticated interaction logic, such as preventing past-date targets for exams while allowing historical entry for mock test scores.
- **Layered Styling Architecture**: Uses modern CSS Layers for strict cascade control.

---

## 2. Technical Architecture

### Core Stack:
- **Framework**: React 18 with TypeScript.
- **Routing**: React Router (react-router-dom) v7.
- **Build System**: Vite (optimized for fast HMR and PWA builds).
- **Package Manager**: pnpm (for efficient dependency management).
- **Styling**: **CSS Layers (@layer)** for explicit cascade priority.
- **Versioning**: Automated via `commit-and-tag-version`.

### Project Structure:
```text
/src
  /core           # Application setup (App.tsx, Routing)
  /features       # Domain-driven features
  /shared         # Reusable code
  /styles         # Centralized Design System
    index.css     # Entry point with @layer declarations
    base.css      # Layer: base (Global elements)
    layout.css    # Layer: layout (App structure)
    /layers       # Core Layer definitions
      _reset.css  # Layer: reset
      _tokens.css # Layer: tokens (CSS Variables)
    /components   # Layer: components
      ui.css      # Basic components
      modals.css  # Consolidated modal system
    /features     # Layer: features (Domain specific)
  main.tsx        # Entry point
```

---

## 3. Styling Strategy

The project utilizes a **CSS Layered Architecture** to solve specificity battles and styling overrides.

### 3.1 CSS Layers:
Styles are organized into a strict hierarchy (lowest to highest priority):
1.  **reset**: Standardizes baseline browser behavior.
2.  **tokens**: Centralized source of truth for all design tokens.
3.  **base**: Fundamental element styling.
4.  **layout**: High-level application shell and navigation.
5.  **components**: Reusable UI primitives (buttons, inputs, modals).
6.  **features**: View-specific layouts and logic.
7.  **utilities**: Single-purpose utility classes for quick overrides.

### 3.2 Design System:
- **Tokens**: Defined in `/layers/_tokens.css`.
- **Accent**: Dynamic `--accent` variable allows real-time UI rebranding, with automatic contrast text calculation.
- **Glassmorphism**: Standardized via `--glass-*` variables.

### 3.3 Theme Logic:
- **Dark Mode**: Uses layered radial gradients to create depth.
- **Dynamic Glass**: Background tints are synchronized across all cards and panels.
- **Adjustable Intensity**: Users can manually control the level of background blur and transparency (Glassmorphism Intensity) via the Settings modal.
- **Custom Backgrounds**: Supports user-uploaded background images with adjustable dimming overlays to ensure content legibility.
- **Performance**: Glass effects are desktop-only; mobile fallback uses solid colors.


---

## 4. Release Management

The project uses **Conventional Commits** and **Semantic Versioning**.
- **Command**: `pnpm release`
- **Output**: Bumps `package.json`, updates `CHANGELOG.md`, and creates Git tags.

---

## 5. Key Data Models

### `PlannerTask`
```typescript
{
    id: string;
    title: string;
    subtitle?: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    completed: boolean;
    completedAt?: string; // ISO
    type: 'chapter' | 'custom';
    subject?: Subject;
    chapterSerial?: number;
    material?: string;
    wasShifted?: boolean;
}
```

### `StudySession`
```typescript
{
    id: string;
    duration: number; // seconds
    startTime: string; // ISO
    endTime: string; // ISO
    type: 'chapter' | 'custom' | 'task';
    title: string;
    subject?: Subject;
    chapterSerial?: number;
    chapterName?: string;
    material?: string;
}
```

---

*This document serves as the ground truth for agents. When in doubt, defer to the behaviors defined here.*
