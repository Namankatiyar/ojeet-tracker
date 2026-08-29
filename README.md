<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&amp;color=6C63FF&amp;height=200&amp;section=header&amp;text=OJEET-Tracker&amp;fontSize=72&amp;fontColor=ffffff&amp;animation=fadeIn&amp;fontAlignY=38&amp;desc=Your%20Premium%20JEE%20%26%20NEET%20Study%20Command%20Centre&amp;descAlignY=60&amp;descSize=18" width="100%"/>

<br/>

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Auth](https://img.shields.io/badge/Google_Auth-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/identity)
[![Email Auth](https://img.shields.io/badge/Email_Auth-10B981?style=for-the-badge&logo=minutemailer&logoColor=white)](#)
<br/>

[![Users](https://img.shields.io/badge/Registered_Users-500%2B-6C63FF?style=for-the-badge&logoColor=white)](#)
[![Discord](https://img.shields.io/badge/Join_Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/6dKrbVQU8W)
[![License](https://img.shields.io/badge/license-%20%20GNU%20GPLv3%20-green)](LICENSE)

<br/>

> **Offline-first. Built for JEE & NEET aspirants who mean business.**

<br/>

</div>

---

## ✨ What is OJEET-Tracker?

**OJEET-Tracker** is a specialized, offline-first study planner and syllabus tracker designed for **JEE** and **NEET** aspirants. Grounded in a high-density, premium glassmorphism design system, it enables students to:

- ⏱️ **Log** active study time with precision
- 📋 **Track** syllabus completion down to granular subtopics across Physics, Chemistry, Maths & Biology
- 📈 **Analyze** daily progress through rich visual dashboards tailored to JEE & NEET mock patterns
- 🤝 **Connect** with peers and stay motivated together

<br/>

---

## 🚀 Key Features

<br/>

### 🎯 Exam Mode Switcher (JEE & NEET)

- **Mode Selection** — Seamlessly toggle between **JEE Mode (PCM)** and **NEET Mode (PCB)** via Settings or during initial Onboarding.
- **Dynamic Subject Filtering** — Navigation, analytics heatmaps, task modals, and AI advice dynamically adapt to active subjects (Physics, Chemistry, Maths for JEE; Physics, Chemistry, Biology for NEET).
- **Dedicated Mock Score Storage** — Independent preset management and score analytics tailored for JEE Main, JEE Advanced, and NEET UG patterns.

<br/>

### 📊 Premium Bento Analytics Dashboard

| Feature                        | Description                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| **12-Column Grid Layout**      | Single-glance dashboard organizing stats, active items, and trends into responsive cards |
| **7-Day Weekly Heatmap**       | Interactive stacked bar chart — Physics, Chemistry, Maths & Biology — relative to selected date |
| **24-Hour Histogram Timeline** | Dynamic hourly capsules with subject-colored gradient glows for active study intervals   |
| **Delta Progress Indicators**  | Real-time metrics comparing today's performance to yesterday                             |
| **Exam Countdown**             | Dynamic timer that shifts Green → Yellow → Red as exam day approaches                    |
| **Motivational Quotes**        | Uplifting quotes randomized on entry to inspire every session                            |

<br/>

### 📚 Subject & Subtopics Workspace _(V2)_

Granular syllabus tracking across **Physics**, **Chemistry**, **Maths**, and **Biology** with:

- **Collapsible Row-Based Subtopics** — Clean, expandable rows replacing card clutter
- **Standardized Resource Dots** — Track preparation across three domains per subtopic:

  | Resource       | Description                         |
  | -------------- | ----------------------------------- |
  | 📖 **NCERT**   | Readings & Exercises                |
  | 📝 **PYQs**    | Previous Years' Questions           |
  | 📦 **Modules** | Coaching material & Reference books |

- **Revision Trackers & Stale Badges** — Warning badges for topics not revised in over 30 days
- **Indeterminate Checkboxes** — Auto-calculated progress states (checked / unchecked / indeterminate)
- **Subject Customization** — Create, rename, hide, or reorder resource columns directly from the UI

<br/>

### 👥 Peer Community & Social System

> _Study better, together._

- 🔗 **Peer Sync** — Share progress cards and compare completion rates with friends
- 📨 **Invite System** — Secure, custom invite links for study partners
- 🖼️ **Dynamic OG Cards** — Beautifully styled shared links with dynamic preview images
- 👁️ **Friend Activity Feed** — Real-time visibility of peers' last seen and active study statuses

<br/>

### 📅 Planner & Study Clock

- **Daily & Monthly Scheduler** — Drag-and-drop weekly view paired with a comprehensive monthly calendar
- **Integrated Study Clock** — Distraction-free stopwatch and countdown timer with tag annotations
- **Auto-Rescheduling** — Incomplete tasks automatically roll forward to Today — zero scheduling debt
- **AI Study Co-Pilot** — Contextual suggestions and task prioritization to optimize sessions

<br/>

### 🎨 Visual Aesthetics & Personalization

- 🔮 **Interactive Glassmorphism** — Sliders to control blur opacity and Refractive Index (prismatic gradients, shadows, ambient lighting)
- 🎨 **Dynamic Theming** — Accent colors altering highlights, glow rings, and progress indicators
- 🌙 **Light & Dark Modes** — Fully tuned typography and color palette for minimal eye strain
- 🃏 **Shareable Progress Card** — Export high-res PNG summary cards with custom avatars via `boring-avatars`

<br/>

### 💾 Persistence & Cloud Sync

- ⚡ **Offline-First Architecture** — LocalStorage as primary source of truth for zero-latency operations
- ☁️ **Multi-Provider Cloud Sync** — Optional Supabase integration for encrypted cloud backups via Google OAuth or Email & Password
- 🗜️ **Compression & Chunking** — LZ-compression and chunked payloads to minimize egress

<br/>

---

## 🏗️ Architecture

OJEET-Tracker is a single-page application (SPA) prioritizing **performance**, **security**, and **aesthetics**.

```
Frontend:         React 18 + TypeScript + Vite
State:            React Context API (modularized)
Styling:          CSS @layer system with strict design tokens
Routing:          React Router v7
Build:            Vite (hot-reload dev + tree-shaken production)
Backend (opt.):   Supabase (Auth, Storage, Realtime)
```

**Context Modules:**

| Context               | Responsibility                                           |
| --------------------- | -------------------------------------------------------- |
| `ThemeContext`        | Appearance, dark/light modes, glassmorphism variables    |
| `SettingsContext`     | Exam mode (`jee` / `neet`), reset hour, sound preferences|
| `SubjectDataContext`  | Syllabus metadata, column headers, subject tables        |
| `UserProgressContext` | Completion percentages, schedules, mock scores           |
| `RemoteAuthContext`   | Supabase Auth, Google OAuth & Email/Password, session tokens |
| `RemoteSyncContext`   | Background delta syncing between LocalStorage & Supabase |

<br/>

---

## 📂 Project Structure

```
ojeet-tracker/
├── public/                 # Static assets & syllabus JSON files (Physics, Chemistry, Maths, Biology)
├── src/
│   ├── core/               # Application bootstrapper
│   │   ├── context/        # Core state providers (Theme, Settings, SubjectData, UserProgress, Auth, Sync)
│   │   ├── hooks/          # Cross-cutting hooks (Keyboard shortcuts, Quotes)
│   │   └── AppRoutes.tsx   # Central routing manifest
│   ├── features/           # Domain-driven features
│   │   ├── community/      # Peer syncing, profiles, invite handler, and social dashboard
│   │   ├── dashboard/      # Bento grid metrics, mock presets, and countdowns
│   │   ├── legal/          # Privacy policy, terms, and changelog views
│   │   ├── planner/        # Drag-and-drop scheduler and monthly calendar
│   │   ├── reports/        # Bento grid daily analytics, weekly subject bars, and timelines
│   │   ├── study-clock/    # Stopwatch & countdown clock
│   │   ├── subjects/       # Syllabus tables, subtopic drawer, and resources customizer
│   │   ├── support/        # Contact forms and Discord community gateways
│   │   └── sync/           # Payload compression and conflict handlers
│   ├── shared/             # General utilities
│   │   ├── components/     # UI elements (Avatars, Modals, Buttons)
│   │   ├── config/         # Subject definitions & NEET/JEE exam mode configurations
│   │   ├── hooks/          # Custom utility hooks (useLocalStorage, useActiveSubjects)
│   │   ├── lib/            # Third-party SDK wrappers (Supabase client)
│   │   └── types/          # Shared TypeScript models and interfaces
│   └── main.tsx            # Main Entrypoint
└── scripts/                # Database seed and patch utilities
```

<br/>

---

## 🛠️ Getting Started

### Prerequisites

- ![Node](https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
- ![pnpm](https://img.shields.io/badge/pnpm-v8%2B-F69220?style=flat-square&logo=pnpm&logoColor=white)

<br/>

### 1. 📥 Installation

```bash
git clone https://github.com/Namankatiyar/ojeet-tracker.git
cd ojeet-tracker
pnpm install
```

### 2. 🔑 Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. ⚡ Start Development

```bash
pnpm dev
```

### 4. 📦 Build for Production

```bash
pnpm build
```

<br/>

---

## 🌐 Community

<div align="center">

**500+ aspirants are already tracking their JEE & NEET journey with OJEET-Tracker.**

Join the community, share progress, and study together!

[![Join our Discord](https://img.shields.io/badge/Join%20our%20Discord-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/6dKrbVQU8W)

</div>

<br/>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=6C63FF&height=120&section=footer" width="100%"/>

**Made with ❤️ for JEE & NEET aspirants**

_Good luck with your preparation. You've got this. 🚀_

</div>
