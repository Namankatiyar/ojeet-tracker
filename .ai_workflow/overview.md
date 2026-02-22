# OJEE Tracker: Technical Project Overview

This documentation provides an exhaustive technical analysis of the OJEE Tracker project. It is designed to empower LLM-based agents with the full context required for complex coding tasks, including feature implementation, bug fixing, and UI/UX enhancements.

**Last Updated:** 2026-02-22

---

## 1. Project Essence & Objective

**OJEE Tracker** is a high-performance, offline-first progress tracking application specifically optimized for academic preparation. It solves the problem of tracking granular completion across multiple subjects (Physics, Chemistry, Maths) and diverse study materials (NCERT, PyQs, Modules, etc.).

### Key Philosophies:
- **Visual-First Progress**: Immediate feedback through rings, bars, and confetti.
- **Extreme Flexibility**: Users can modify the syllabus, add/remove resource columns, and reorder content.
- **Deep Persistence**: Leveraging `localStorage` for a zero-server, instant-load experience.
- **Shareable Achievement**: The **Personalized Progress Card** feature allows users to generate and download (PNG) a card summarizing their achievements, featuring dynamic avatars (via `boring-avatars`) and customizable stats.
- **Integrated Toolset**: Combines syllabus tracking with a daily/monthly planner (featuring Shift+Drag duplication) and a dedicated study clock.
- **Hybrid Time Tracking**: Supports both real-time stopwatch tracking and manual log entry for offline study sessions.
- **Unified Actions**: Deep integration between the Study Clock and Planner, allowing users to "Mark Complete" a task directly from the timer interface.
- **Personalized Appearance**: High degree of UI customization, including custom background wallpapers, adjustable background dimming, and advanced glassmorphism controls.
- **Advanced Glassmorphism**: Implementation of a **Refractive Index** control that dynamically adjusts saturation, brightness, and prismatic hue-rotation for a high-fidelity "refracted glass" look.
- **Intelligent Theming**: Automatic accent color extraction from custom wallpapers using `node-vibrant` for a cohesive look.
- **Context-Aware UI**: Sophisticated interaction logic, such as preventing past-date targets for exams while allowing historical entry for mock test scores.
- **Layered Styling Architecture**: Uses modern CSS Layers for strict cascade control.

---

## 2. Technical Architecture

### Core Stack:
- **Framework**: React 18 with TypeScript.
- **State Management**: **React Context API** (Modular architecture).
- **Routing**: React Router (react-router-dom) v7.
- **Build System**: Vite (optimized for fast HMR and PWA builds).
- **Package Manager**: pnpm (for efficient dependency management).
- **Styling**: **CSS Layers (@layer)** for explicit cascade priority.
- **Versioning**: Automated via `commit-and-tag-version`.

### Project Structure:
```text
/src
  /core           # Application setup (Providers, Hooks, Routing)
    /context      # React Context Providers for global state
    /hooks        # Business logic hooks (shortcuts, auto-shift, quotes)
    App.new.tsx   # Modular application entry point
    AppRoutes.tsx # Centralized Route definitions
  /features       # Domain-driven features (Dashboard, Planner, StudyClock, Subjects)
  /shared         # Reusable code (UI components, generic hooks, utils, types)
  /styles         # Centralized Design System using CSS Layers
    index.css     # Entry point with @layer declarations
    base.css      # Layer: base (Global elements)
    layout.css    # Layer: layout (App structure)
    /layers       # Core Layer definitions (_reset.css, _tokens.css)
    /components   # Layer: components (ui.css, modals.css)
    /features     # Layer: features (Domain specific)
  main.tsx        # Entry point
```

---

## 3. State Management (Context API)

The application uses a **Layered Provider Pattern** to handle global state and side effects, ensuring separation of concerns and optimized re-rendering.

### 3.1 ThemeContext
- **Responsibilities**: Manages `theme`, `accentColor`, `backgroundUrl`, `dimLevel`, and glassmorphism settings.
- **Logic**: Automatically updates `document.documentElement` CSS variables and PWA meta tags when visual settings change.

### 3.2 SubjectDataContext
- **Responsibilities**: Manages the syllabus structure for Physics, Chemistry, and Maths.
- **Logic**: Handles initial CSV parsing, custom column management, material exclusion, and material/chapter ordering logic.

### 3.3 UserProgressContext
- **Responsibilities**: Manages completion progress, planner tasks, study sessions, and mock scores.
- **Logic**: Coordinates complex interactions, such as syncing "Mark Complete" actions between the Planner and Subject syllabus.

---

## 4. Styling Strategy

The project utilizes a **CSS Layered Architecture** to solve specificity battles and styling overrides. Styles are organized into a strict hierarchy: `reset`, `tokens`, `base`, `layout`, `components`, `features`, `utilities`.

---

## 5. Release Management

The project uses **Conventional Commits** and **Semantic Versioning**.
- **Command**: `pnpm release`
- **Output**: Bumps `package.json`, updates `CHANGELOG.md`, and creates Git tags.

---

## 6. Refactoring History

### Dashboard De-bloat (v0.0.17)
- **Problem**: The analytics dashboard was a monolithic "God Component" causing performance bottlenecks and maintenance issues.
- **Solution**: Decomposed into `StudyTimePanel`, `MockScoresPanel`, and `AddMockModal`.
- **Optimization**: Extracted data aggregation logic into memoized custom hooks (`useStudyTimeAnalytics`, `useMockScoresAnalytics`) to isolate re-renders and improve UI responsiveness.

---

*This document serves as the ground truth for agents. When in doubt, defer to the behaviors defined here.*
