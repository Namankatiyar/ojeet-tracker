# OJEE Tracker: Technical Project Overview

This documentation provides an exhaustive technical analysis of the OJEE Tracker project. It is designed to empower LLM-based agents with the full context required for complex coding tasks, including feature implementation, bug fixing, and UI/UX enhancements.

**Last Updated:** 2026-01-19

---

## 1. Project Essence & Objective

**OJEE Tracker** is a high-performance, offline-first progress tracking application specifically optimized for academic preparation. It solves the problem of tracking granular completion across multiple subjects (Physics, Chemistry, Maths) and diverse study materials (NCERT, PyQs, Modules, etc.).

### Key Philosophies:
- **Visual-First Progress**: Immediate feedback through rings, bars, and confetti.
- **Extreme Flexibility**: Users can modify the syllabus, add/remove resource columns, and reorder content.
- **Deep Persistence**: Leveraging `localStorage` for a zero-server, instant-load experience.
- **Integrated Toolset**: Combines syllabus tracking with a daily/monthly planner and a dedicated study clock.
- **Modular Architecture**: Clean separation between core logic, features, and styling.

---

## 2. Technical Architecture

### Core Stack:
- **Framework**: React 18 with TypeScript.
- **Routing**: React Router (react-router-dom) v7.
- **Build System**: Vite (optimized for fast HMR and PWA builds).
- **Package Manager**: pnpm (for efficient dependency management).
- **Styling**: Modular Vanilla CSS with a **CSS Variables Design System**.
- **Versioning**: Automated via `commit-and-tag-version`.

### Project Structure:
```text
/src
  /core           # Application setup (App.tsx, Routing)
  /features       # Domain-driven features
    /dashboard    # Main overview, Analytics, Mock scores
    /subjects     # Detailed tracking per subject (Syllabus)
    /planner      # Weekly/Monthly calendar and task engine
    /study-clock  # Persistent timer and analytics
  /shared         # Reusable code
    /components   # UI components (Modals, Headers, Progress Bars)
    /hooks        # Custom hooks (useLocalStorage, useProgress)
    /types        # TypeScript interfaces/types
    /utils        # Helper functions (CSV, Date, Confetti)
  /styles         # Centralized Design System
    base.css      # Reset and global elements
    layout.css    # Header, Nav, Main container
    theme.css     # Design tokens and theme logic
    /features     # Feature-specific styling
    /components   # Shared UI and Misc component styling
  main.tsx        # Entry point
```

---

## 3. Styling Strategy

The project recently transitioned from a monolithic `App.css` to a modular system in `/src/styles/`.

### 3.1 Design System:
- **Tokens**: Defined in `theme.css` using CSS Variables.
- **Accent**: Dynamic `--accent` variable allows real-time UI rebranding.
- **Glassmorphism**: Standardized via `--glass-*` variables, with performance fallbacks for mobile devices.

### 3.2 Dark Mode:
- **Depth**: Uses 5+ layered radial gradients (blobs) in `base.css` to create a premium atmosphere.
- **Glass Effect**: DESKTOP ONLY implementation of `backdrop-filter: blur(4px)` to ensure smooth performance on low-end mobile devices.

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
