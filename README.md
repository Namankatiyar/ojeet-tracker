# OJEE-Tracker

**OJEE-Tracker** is a specialized, offline-first progress tracking application designed for students preparing for examinations. It provides a comprehensive dashboard to monitor preparation across Physics, Chemistry, and Maths, with a focus on granular resource tracking, visual motivation, and persistent data storage.

## 🚀 Features

### 📊 Preparation Dashboard
*   **Visual Overview:** Tracks your overall completion percentage across all subjects using interactive progress rings.
*   **Motivational Quotes:** Fetches a new motivational quote every time you open the app to keep you inspired.
*   **Exam Countdown:** A dynamic countdown timer to your target JEE exam date. The counter visually shifts color (Green → Yellow → Red) as the date approaches.

### 📚 Dynamic Subject Management
*   **Granular Tracking:** Track progress for every individual chapter in Physics, Chemistry, and Maths.
*   **Custom Resources:** Add custom study material columns (e.g., specific coaching modules, YouTube channels, reference books) directly from the UI.
*   **Flexible Layout:** Remove or hide columns you don't use via a confirmation modal to keep your workspace clean.
*   **Status Indicators:** Mark chapters as completed, in-progress, or not started.

### 📅 Planner & Study Clock
*   **Daily & Monthly Planner:** Manage your schedule with a drag-and-drop weekly view and a comprehensive monthly calendar.
*   **Integrated Timer:** A distraction-free study clock that tracks your sessions and provides detailed analytics.
*   **Auto-Rescheduling:** Incomplete tasks from past days are automatically moved to "Today" to ensure nothing falls through the cracks.

### 🎉 Visual Rewards
*   **Celebrations:** Experience a burst of confetti (themed to your selected accent color) whenever you mark a chapter as completed.

### 🎨 Personalization
*   **Custom Wallpapers:** Upload your own background images to create a personalized study environment.
*   **Shareable Progress Card:** Generate a beautiful, customizable progress card with study stats. Features dynamic avatars (integrated with `boring-avatars`), custom avatar upload, and high-resolution PNG export.
*   **Adjustable Glassmorphism:** Real-time sliders to control blur intensity and the **Refractive Index** (controlling saturation, brightness, and prismatic hue-rotation) of all UI panels.
*   **Background Dimming:** Precision control over the dimming overlay to ensure text readability on any background.
*   **Dynamic Theming:** Choose from a modern palette of accent colors. Your choice influences shadows, background tints, analogous gradients, avatars, and progress indicators throughout the app.
*   **Dark/Light Mode:** Fully supported themes to reduce eye strain during late-night study sessions.

### 💾 Persistence
*   **Local Storage:** All your data—progress, exam date, custom columns, tasks, and theme preferences—is saved locally in your browser. No login or internet connection required (except for fetching quotes).
*   **Data Backup:** Export and import your data as JSON to move between devices.

### 📱 Install as App (PWA)
**OJEE-Tracker** is a Progressive Web App. This means you can install it on your device for a native-like experience.
*   **Offline Access:** Works without an internet connection.
*   **No "Server" Required:** Once installed, you just click the icon to launch.
*   **How to Install:**
    1.  Open the app in Chrome or Edge.
    2.  Click the "Install" icon in the address bar (or look in the browser menu for "Install OJEE-Tracker").
    3.  Launch it from your Desktop or Start Menu like any other program.

## 🏗️ Architecture

OJEE-Tracker is built as a single-page application (SPA) focused on performance and user experience.

*   **Frontend Framework:** [React 18](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/) for robust type safety.
*   **Routing:** [React Router](https://reactrouter.com/) (v7) for seamless navigation.
*   **Build Tool:** [Vite](https://vitejs.dev/) for lightning-fast development server and optimized production builds.
*   **Styling:** Modern **CSS Layers (@layer)** architecture for strict cascade control. Features a advanced glassmorphism design system, dynamic background customization, and `lucide-react` for modern iconography.
*   **Data Persistence:** A custom `useLocalStorage` hook abstracts the browser's `localStorage` API, ensuring state persists across sessions without a backend database.

## 📂 Project Structure

```
src/
├── core/               # Application setup (routing, global styles)
├── features/           # Domain-driven features (Dashboard, Planner, etc.)
├── shared/             # Reusable UI components, hooks, and utils
└── main.tsx            # Entry point
```

## 🛠️ Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ojee-tracker.git
    ```
2.  **Install dependencies:**
    ```bash
    pnpm install
    ```
3.  **Start the development server:**
    ```bash
    pnpm dev
    ```
4.  **Build for production:**
    ```bash
    pnpm build
    ```

---
*Created to help JEE aspirants stay focused and organized.*