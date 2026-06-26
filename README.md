# 🌌 OJEE-Tracker

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

**OJEE-Tracker** is a specialized, offline-first study planner and syllabus tracker designed for JEE and OJEE aspirants. Grounded in a high-density, premium glassmorphism design system, it enables students to log active study time, track syllabus completion down to granular subtopics, analyze daily progress, and stay motivated.

---

## 🚀 Key Features

### 📊 Premium Bento Analytics Dashboard
*   **12-Column Grid Layout:** A single-glance dashboard that organizes stats, active items, and trends into responsive cards.
*   **7-Day Weekly Heatmap:** Interactive stacked bar chart displaying study time categorized by subject (Physics, Chemistry, Maths) relative to the selected date.
*   **24-Hour Histogram Timeline:** Dynamic hourly capsules with subject-colored gradient glows tracking active study intervals.
*   **Delta Progress Indicators:** Real-time metrics comparing today's performance to yesterday (e.g., "vs Thu", displaying "so far" for active days).
*   **Exam Countdown:** Dynamic countdown timer that changes color (Green → Yellow → Red) as your target exam date approaches.
*   **Motivational Quotes:** Uplifting quotes randomized on entry to inspire study sessions.

### 📚 Subject & Subtopics Workspace (V2)
*   **Granular Syllabus Tracking:** Full Physics, Chemistry, and Maths syllabus tracking down to specific chapters.
*   **Collapsible Row-Based Subtopics:** Replaces card clutter with clean, expandable rows.
*   **Standardized Resource Dots:** Track preparation across three domains for each subtopic:
    *   **NCERT** (Readings & Exercises)
    *   **PYQs** (Previous Years Questions)
    *   **Modules** (Coaching material/Reference books)
*   **Revision Trackers & Stale Badges:** Track revision count and date per subtopic. Warning badges dynamically appear for topics not revised in over 30 days.
*   **Indeterminate Main Checkboxes:** Subject tables auto-calculate progress; checkboxes display checked, unchecked, or indeterminate states based on subtopic status.
*   **Subject Customization:** Create, rename, hide, or reorder resource columns directly from the UI.

### 👥 Peer Community & Social System
*   **Peer Sync:** Share progress cards and connect with friends to compare completion rates.
*   **Invite System:** Seamlessly invite study partners using secure, custom invite links.
*   **Dynamic Open Graph Cards:** Beautifully styled shared links with dynamic preview images displaying your avatar and preparation statistics.
*   **Friend Activity Feed:** Real-time visibility of peers' last seen and active study statuses.

### 📅 Planner & Study Clock
*   **Daily & Monthly Scheduler:** Drag-and-drop weekly view paired with a comprehensive monthly calendar.
*   **Integrated Study Clock:** Distraction-free stopwatch and countdown timer recording session durations with tag annotations.
*   **Auto-Rescheduling:** Incomplete tasks automatically roll forward to "Today" to eliminate scheduling debt.
*   **AI Study Co-Pilot:** Contextual suggestions and task prioritization cues to optimize study sessions.

### 🎨 Visual Aesthetics & Personalization
*   **Interactive Glassmorphism:** Control panel sliders to adjust blur opacity and **Refractive Index** (controlling prismatic gradients, shadows, and analogous lighting).
*   **Dynamic Theming:** Select from tailored accent colors that alter ambient highlights, glow rings, and progress indicators.
*   **Light & Dark Modes:** Fully customized typography and color palette to minimize eye strain.
*   **Shareable Progress Card:** Export high-resolution PNG summary cards featuring custom avatars (integrated with `boring-avatars`).

### 💾 Persistence & Cloud Sync
*   **Offline-First Architecture:** Uses local storage as the primary source of truth for zero-latency operations.
*   **Robust Sync Engine:** Optional Supabase integration for encrypted cloud backups.
*   **Compression & Chunking:** Uses LZ-compression and chunked payloads to optimize data transfer and keep egress low.

---

## 🏗️ Architecture

OJEE-Tracker is built as a single-page application (SPA) prioritizing performance, security, and aesthetics.

*   **Frontend:** React 18 + TypeScript + Vite.
*   **State Management:** React Context API modularized into:
    *   `ThemeContext`: Manages appearance, dark/light modes, and custom glassmorphism variables.
    *   `SubjectDataContext`: Handles syllabus metadata, customize column headers, and subject tables.
    *   `UserProgressContext`: Stores completion percentages, active schedules, and mock test scores.
    *   `RemoteAuthContext`: Manages Supabase Auth, Google OAuth, and session tokens.
    *   `RemoteSyncContext`: Coordinates background delta syncing between LocalStorage and Supabase.
*   **Styling:** Structured CSS layers (`@layer`) organizing CSS variables, layouts, and components. Strictly uses system tokens rather than ad-hoc rules.
*   **Routing:** React Router v7 driving page navigations.
*   **Bundling & Build:** Vite for hot-reloading development and tree-shaken, optimized production assets.

---

## 📂 Project Structure

```
ojee-tracker/
├── public/                 # Static assets & syllabus JSON files (Physics, Chemistry, Maths)
├── src/
│   ├── core/               # Application bootstrapper
│   │   ├── context/        # Core state providers (Theme, SubjectData, UserProgress, Auth, Sync)
│   │   ├── hooks/          # Cross-cutting hooks (Keyboard shortcuts, Quotes)
│   │   └── AppRoutes.tsx   # Central routing manifest
│   ├── features/           # Domain-driven features
│   │   ├── community/      # Peer syncing, profiles, invite handler, and social dashboard
│   │   ├── dashboard/      # Bento grid metrics, mock presets, and countdowns
│   │   ├── legal/          # Privacy policy and terms views
│   │   ├── planner/        # Drag-and-drop scheduler and monthly calendar
│   │   ├── reports/        # Bento grid daily analytics, weekly subject bars, and timelines
│   │   ├── study-clock/    # Stopwatch & countdown clock
│   │   ├── subjects/       # Syllabus tables, subtopic drawer, and resources customizer
│   │   ├── support/        # Contact forms and Discord community gateways
│   │   └── sync/           # Payload compression and conflict handlers
│   ├── shared/             # General utilities
│   │   ├── components/     # UI elements (Avatars, Modals, Buttons)
│   │   ├── hooks/          # Custom utility hooks (`useLocalStorage`, `useProgress`)
│   │   ├── lib/            # Third-party SDK wrappers (Supabase client instance)
│   │   └── types/          # Shared TypeScript models and interfaces
│   └── main.tsx            # Main Entrypoint
└── scripts/                # Database seed and patch utilities
```

---

## 🛠️ Getting Started

### Prerequisites
*   Node.js (v18+)
*   pnpm (v8+)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Namankatiyar/ojee-tracker.git
cd ojee-tracker
pnpm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root folder and add your credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Start Development
Run the local server:
```bash
pnpm dev
```

### 4. Build for Production
Create optimized static builds:
```bash
pnpm build
```

---

*Created with ❤️ for JEE and aspirants.*
