# OJEE Tracker: Technical Project Overview

This documentation provides an exhaustive technical analysis of the OJEE Tracker project. It is designed to empower LLM-based agents with the full context required for complex coding tasks, including feature implementation, bug fixing, and UI/UX enhancements.

---

## 1. Project Essence & Objective

**OJEE Tracker** is a high-performance, offline-first progress tracking application specifically optimized for preparation. It solves the problem of tracking granular completion across multiple subjects (Physics, Chemistry, Maths) and diverse study materials (NCERT, PyQs, Modules, etc.).

### Key Philosophies:
- **Visual-First Progress**: Immediate feedback through rings, bars, and confetti.
- **Extreme Flexibility**: Users can modify the syllabus, add/remove resource columns, and reorder content.
- **Deep Persistence**: Leveraging `localStorage` for a zero-server, instant-load experience.
- **Integrated Toolset**: Combines syllabus tracking with a daily/monthly planner and a dedicated study clock.
- **Premium Aesthetics**: Glassmorphism, dynamic glows, and smooth micro-animations.

---

## 2. Technical Architecture

### Core Stack:
- **Framework**: React 18 with TypeScript.
- **Routing**: React Router (react-router-dom) v7.
- **Build System**: Vite (optimized for fast HMR and PWA builds).
- **Styling**: Vanilla CSS with a robust **CSS Variables Design System** and Glassmorphism.
- **Icons**: Lucide-React.
- **Animations**: Canvas-Confetti (for completion celebrations).
- **Data Handling**: PapaParse for CSV parsing of initial syllabus data.

### Project Structure:
```text
/src
  /core           # Application setup (routing, global styles)
  /features       # Domain-driven features
    /dashboard    # Main overview with rings and agenda
    /subjects     # detailed tracking per subject
    /planner      # Weekly/Monthly calendar and task engine
    /study-clock  # Persistent timer and analytics
  /shared         # Reusable code
    /components   # UI components (Modals, Headers, Progress Bars)
    /hooks        # Custom hooks (useLocalStorage)
    /types        # TypeScript interfaces/types
    /utils        # Helper functions (CSV, Date, Confetti)
  main.tsx        # Entry point
  quotes.json     # Curated database for motivational quotes
/public
  /data           # Default syllabus CSVs (physics.csv, etc.)
  /cross-images   # Overlay icons for past days in planner
```

---

## 3. Core Features & Functional Logic

### 3.1 Syllabus & Progress Tracking (`SubjectPage.tsx`, `ChapterRow.tsx`)
- **Dynamic Columns**: Allows users to add custom columns or hide default ones (NCERT, PyQs, etc.).
- **Priority System**: Chapters can be assigned priorities (`high`, `medium`, `low`, `none`), which visually tints rows.
- **Completion Logic**: A chapter is "Completed" only when ALL columns for that row are checked. This triggers a full-screen confetti effect.
- **Data Customization**: Users can rename chapters, change serial numbers, and reorder the syllabus.

### 3.2 Daily & Monthly Planner (`Planner.tsx`, `TaskModal.tsx`)
- **Dual View Modes**:
    - **Weekly**: A grid-based schedule with drag-and-drop support.
    - **Monthly**: A comprehensive calendar grid showing task density (dots) and study hours per day.
- **Task Types**:
    - **General**: Custom title/subtitle.
    - **Chapter-linked**: Directly tied to a Subject, Chapter, and Material. Moving these tasks or completing them syncs with the Syllabus progress.
- **Auto-Shifting**: Incomplete tasks from past days are automatically moved to "Today" with a **"Pending"** or **"Delayed"** indicator.
- **UI Details**: Past days in the monthly view feature "Cross Overlays" (using `/cross-images/cross{1-5}.png`) with randomized contrast for a realistic, journal-like feel.

### 3.3 Study Clock (`StudyClock.tsx`)
- **Persistence 2.0**: The timer state (running or paused) survives page refreshes and browser restarts by persisting the start time, elapsed time, and task metadata in `localStorage`.
- **Engagement Modes**:
    - **Syllabus**: Select directly from the subject tree.
    - **Tasks**: Start a timer for an existing planner task (auto-fills metadata).
    - **Custom**: Free-form session naming.
- **Fullscreen Mode**: A minimalist, distraction-free view (triggered by 'F' key or clicking the timer).
- **Advanced Analytics**:
    - **Statistics Panel**: Filterable by Subject, Chapter, and Material.
    - **Distribution Modal**: Visual breakdown (bars) of study time across subjects.
    - **Session Log**: Permanent record of all sessions with delete functionality.
- **Shortcuts**: `Space` for play/pause, `F` for fullscreen, `Esc` to exit fullscreen/pause.

### 3.4 Data Management (`SettingsModal.tsx`)
- **JSON Backup**: Users can export their entire application state (progress, tasks, customs) as a JSON file.
- **Import/Restore**: Allows restoring data from a previous backup, with a standard confirmation warning as it overwrites current local storage.
- **Portability**: Facilitates moving data between different devices/browsers without a server.

---

## 4. State Management & Data Persistence

### Global Domain State (`App.tsx`):
The application uses a "Single Source of Truth" pattern in `App.tsx`.
- `progress`: Maps `Subject -> ChapterSerial -> MaterialName -> Boolean`.
- `plannerTasks`: Array of `PlannerTask` objects.
- `subjectData`: The structure of the syllabus itself.
- `studySessions`: Log of all completed timer sessions.
- `accentColor`: Global dynamic theme color.

### LocalStorage Schema:
- `jee-tracker-progress`: Completion matrix.
- `jee-tracker-planner-tasks`: Schedule data.
- `jee-tracker-subject-data`: Users' modified version of the syllabus.
- `jee-tracker-accent`: Custom hex color.
- `jee-tracker-running-timer` / `jee-tracker-paused-timer`: Transient state for the Study Clock.

---

## 5. UI/UX Design System (`App.css`)

The UI follows a **"Glow-Minimalist Glassmorphism"** aesthetic.

### 5.1 Design Tokens:
- **Font**: **Inter** (Global) with fallback to system sans-serif.
- **Themes**: Light and Dark modes.
- **Accent**: Dynamic `--accent` variable, used with `color-mix(in srgb, var(--accent), ...)` to create derivatives like `--accent-light` and `--accent-border`.

### 5.2 Dark Mode Aesthetics (Critical for Agents):
- **Glassmorphism**: Components use `backdrop-filter: blur(4px)` and semi-transparent backgrounds (`rgba(18, 18, 26, 0.35)`).
- **Radial Blobs**: The body background features 5+ layered radial gradients (blobs) in various colors (accent, purple, teal, amber) to create a premium, depth-rich environment.
- **Inner Glows**: `inset 0 1px 1px rgba(255, 255, 255, 0.1)` on cards for that "glass edge" look.
- **Shadow Glow**: `box-shadow` that incorporates the current accent color for a glowing effect.

### 5.3 Micro-interactions:
- **Hover Transitions**: `150ms-250ms` ease for all interactive elements.
- **Confetti**: `canvas-confetti` used for checkmark toggles (small) and chapter completion (large).
- **Progress Animation**: Rings and bars animate property changes using CSS transitions.

---

## 6. Technical Documentation & Guidelines

### 1. Adding a New Component:
- Define interfaces in `src/types/index.ts`.
- Use CSS variables (`var(--accent)`, `var(--bg-secondary)`, etc.) for all colors.
- Follow the Glassmorphism pattern for dark mode by applying common variables defined in `App.css`.

### 2. Modifying State:
- Always pass state-setters down from `App.tsx` or use the provided handlers.
- Use the `useLocalStorage` hook for simple persistent state.
- For complex sync (e.g., Planner Task completion checking a Syllabus Box), ensure both state slices are updated in `App.tsx`.

### 3. UI/UX Standards:
- Modals must be dismissible via overlay click and `Escape`.
- Buttons must have distinct `:hover` and `:active` states.
- Ensure high density in tables but maintain readability via tiered text colors (`--text-secondary`, `--text-muted`).

### 4. Logic Sync:
- **Bidirectional Linking**: Completing a "Chapter Task" in the planner must update the corresponding material checkbox in the `SubjectPage`.

---

## 7. Key Data Models

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