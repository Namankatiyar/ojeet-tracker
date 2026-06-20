# Graph Report - .  (2026-06-20)

## Corpus Check
- 153 files · ~91,287 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 668 nodes · 1493 edges · 36 communities (25 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Co-Pilot & Subject Reports|Co-Pilot & Subject Reports]]
- [[_COMMUNITY_Calendar Planner & Grid|Calendar Planner & Grid]]
- [[_COMMUNITY_Session History & Study Clock|Session History & Study Clock]]
- [[_COMMUNITY_Remote Supabase Sync|Remote Supabase Sync]]
- [[_COMMUNITY_Chapter Details Drawer|Chapter Details Drawer]]
- [[_COMMUNITY_Task Modals & Headers|Task Modals & Headers]]
- [[_COMMUNITY_Mock Exams & Presets|Mock Exams & Presets]]
- [[_COMMUNITY_NPM Dependencies|NPM Dependencies]]
- [[_COMMUNITY_Development Tooling|Development Tooling]]
- [[_COMMUNITY_TypeScript Configurations|TypeScript Configurations]]
- [[_COMMUNITY_PWA Lifecycle Updates|PWA Lifecycle Updates]]
- [[_COMMUNITY_Study Time Analytics|Study Time Analytics]]
- [[_COMMUNITY_Developer Design Guidelines|Developer Design Guidelines]]
- [[_COMMUNITY_Dashboard Layout & Settings|Dashboard Layout & Settings]]
- [[_COMMUNITY_Daily Study Analytics|Daily Study Analytics]]
- [[_COMMUNITY_Notification Center|Notification Center]]
- [[_COMMUNITY_Remote User Authentication|Remote User Authentication]]
- [[_COMMUNITY_Vitest Mock Services|Vitest Mock Services]]
- [[_COMMUNITY_Google OAuth Sign-In|Google OAuth Sign-In]]
- [[_COMMUNITY_Progress Bar & Ring|Progress Bar & Ring]]
- [[_COMMUNITY_Changelog & Release Notes|Changelog & Release Notes]]
- [[_COMMUNITY_Open Graph Assets|Open Graph Assets]]
- [[_COMMUNITY_Performance Benchmarks|Performance Benchmarks]]
- [[_COMMUNITY_UI Styling Prompts|UI Styling Prompts]]
- [[_COMMUNITY_Vercel Routing Configurations|Vercel Routing Configurations]]
- [[_COMMUNITY_Progress State Icons|Progress State Icons]]
- [[_COMMUNITY_Vite Environment Decl|Vite Environment Decl]]
- [[_COMMUNITY_Vite Build Config|Vite Build Config]]
- [[_COMMUNITY_PNPM Workspace Config|PNPM Workspace Config]]
- [[_COMMUNITY_Arrow Down Icon|Arrow Down Icon]]
- [[_COMMUNITY_Arrow Up Icon|Arrow Up Icon]]
- [[_COMMUNITY_Robots Txt Config|Robots Txt Config]]

## God Nodes (most connected - your core abstractions)
1. `StudySession` - 41 edges
2. `Subject` - 40 edges
3. `PlannerTask` - 40 edges
4. `formatDateLocal()` - 28 edges
5. `SubjectData` - 27 edges
6. `MockScore` - 23 edges
7. `useUserProgress()` - 19 edges
8. `compilerOptions` - 18 edges
9. `useLocalStorage()` - 17 edges
10. `Priority` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Premium Glassmorphism Styling Standard` --conceptually_related_to--> `OJEE Tracker Design Philosophy`  [INFERRED]
  DESIGN_SYSTEM.md → .agents/skills/ojee-tracker-design/SKILL.md
- `OJEE Tracker Design Philosophy` --conceptually_related_to--> `Project Overview & Agent Context`  [INFERRED]
  .agents/skills/ojee-tracker-design/SKILL.md → AGENTS.md
- `OJEE Tracker Design Philosophy` --rationale_for--> `Design Tokens & Constraints`  [INFERRED]
  .agents/skills/ojee-tracker-design/SKILL.md → DESIGN_SYSTEM.md
- `Dynamic Accent Color Engine` --conceptually_related_to--> `Design Tokens & Constraints`  [INFERRED]
  .agents/skills/ojee-tracker-design/SKILL.md → DESIGN_SYSTEM.md
- `Strict 4px Spacing Grid` --conceptually_related_to--> `Design Tokens & Constraints`  [INFERRED]
  .agents/skills/ojee-tracker-design/SKILL.md → DESIGN_SYSTEM.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **UI Component Lifecycle and Walkthrough Standards** — prompts_ui_component_design_specification, prompts_ui_component_fix_auditreport, css_animation_skill_skill_walkthrough [INFERRED 0.85]
- **Design System and Styling Architecture Framework** — ojee_tracker_design_skill_philosophy, design_system_tokens, design_system_glassmorphism, ojee_tracker_design_skill_layers [INFERRED 0.95]
- **Project Documentation & Developer Context** — overview_technical, readme_project, agents_context [EXTRACTED 1.00]

## Communities (36 total, 11 thin omitted)

### Community 0 - "Co-Pilot & Subject Reports"
Cohesion: 0.05
Nodes (49): CoPilotNudgeRow(), CoPilotNudgeRowProps, ReportsPage(), SubjectDataContext, SubjectDataProvider(), useSubjectData(), Theme, ThemeContext (+41 more)

### Community 1 - "Calendar Planner & Grid"
Cohesion: 0.07
Nodes (45): CalendarGrid(), CalendarGridProps, WEEKDAY_HEADERS, DashboardProps, DayColumn(), DayColumnProps, DayModal(), DayModalProps (+37 more)

### Community 2 - "Session History & Study Clock"
Cohesion: 0.06
Nodes (48): SessionHistory(), formatDuration(), SessionStatistics(), StudyClock(), buildCountdownCompletionState(), buildNextPhaseState(), clampDeltaMs(), CountdownConfig (+40 more)

### Community 3 - "Remote Supabase Sync"
Cohesion: 0.06
Nodes (54): AGGREGATE_SELECT_COLUMNS, createLocalPayload(), DEFAULT_DELTA_CURSOR, DeltaCursor, domainKeys, fetchRemotePayload(), getDomainEditedAt(), hasLocalUnsyncedEdit() (+46 more)

### Community 4 - "Chapter Details Drawer"
Cohesion: 0.07
Nodes (45): ChapterDetailDrawer(), ChapterDetailDrawerProps, confidenceColorsList, formatDateDisplay(), getConfidenceLabel(), todayString(), HoverPanel(), HoverPanelProps (+37 more)

### Community 5 - "Task Modals & Headers"
Cohesion: 0.07
Nodes (43): SessionHistoryProps, SessionStatisticsProps, StudyClockProps, subjectConfig, SubjectHeaderProps, TaskModal(), TaskModalProps, SubjectDataContextType (+35 more)

### Community 6 - "Mock Exams & Presets"
Cohesion: 0.10
Nodes (33): AddMockModal(), AddMockModalProps, createEmptySubjectMarks(), AnalyticsPanelsProps, ManageMockPresetsModal(), ManageMockPresetsModalProps, MockScoresPanel(), MockScoresPanelProps (+25 more)

### Community 7 - "NPM Dependencies"
Cohesion: 0.06
Nodes (33): bin, dependencies, boring-avatars, canvas-confetti, chart.js, express, html2canvas, lucide-react (+25 more)

### Community 8 - "Development Tooling"
Cohesion: 0.08
Nodes (24): devDependencies, commit-and-tag-version, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom (+16 more)

### Community 9 - "TypeScript Configurations"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 10 - "PWA Lifecycle Updates"
Cohesion: 0.17
Nodes (14): PwaUpdateBanner(), applyPwaUpdate(), CACHE_PREFIXES_TO_CLEAR, cleanupLegacyCachesOnce(), dismissUpdateNotice(), getPwaBridgeState(), initPwaBridge(), listeners (+6 more)

### Community 11 - "Study Time Analytics"
Cohesion: 0.19
Nodes (12): StudyTimePanel(), StudyTimePanelProps, StudyViewMode, RemoteAggregateBucketEntry, useStudyTimeAnalytics(), getChartOptions(), getMonthDays(), getStudyTimeBySubject() (+4 more)

### Community 12 - "Developer Design Guidelines"
Cohesion: 0.13
Nodes (15): Project Overview & Agent Context, Subtopics Tracking & Chapter Workspace V2, Project Release Changelog, Supabase Delta Sync & Egress Optimization, Trigonometric Positioning Formulas, Premium Glassmorphism Styling Standard, Design Tokens & Constraints, Vite HTML Entrypoint & SEO Fallback (+7 more)

### Community 13 - "Dashboard Layout & Settings"
Cohesion: 0.19
Nodes (12): AnalyticsPanels(), Dashboard(), useRemoteAuth(), useRemoteSync(), SettingsModal(), SettingsModalProps, STORAGE_KEYS, mockNavigate (+4 more)

### Community 14 - "Daily Study Analytics"
Cohesion: 0.26
Nodes (8): DailyAnalytics(), formatDateDisplay(), formatHourLabel(), formatSmartDuration(), formatStatValue(), getLocalDateString(), DatePickerModal(), DatePickerModalProps

### Community 15 - "Notification Center"
Cohesion: 0.23
Nodes (8): DashboardNotificationAction, DashboardNotificationCenter(), DashboardNotificationCenterProps, DashboardNotificationItem, TaskLog(), TaskLogProps, PwaInstallPromptModal(), PwaInstallPromptModalProps

### Community 16 - "Remote User Authentication"
Cohesion: 0.22
Nodes (6): RemoteAuthContext, RemoteAuthContextType, RemoteAuthProvider(), isSupabaseConfigured, supabaseAnonKey, supabaseUrl

### Community 18 - "Google OAuth Sign-In"
Cohesion: 0.33
Nodes (4): CloudSyncPromptModal(), CloudSyncPromptModalProps, GoogleSignInButton(), GoogleSignInButtonProps

### Community 19 - "Progress Bar & Ring"
Cohesion: 0.47
Nodes (4): ProgressBar(), ProgressBarProps, ProgressRing(), ProgressRingProps

### Community 21 - "Open Graph Assets"
Cohesion: 0.40
Nodes (5): OJEE Tracker Open Graph Image, Dashboard Layout UI, Vibrant Dark-Theme Glassmorphism Aesthetics, Mock Exam Scores Trend Line Chart, Weekly/Monthly Study Time Stacked Bar Chart

### Community 23 - "UI Styling Prompts"
Cohesion: 0.67
Nodes (3): CSS Animation Walkthrough Skill, Component Specification Template, Component Audit & Overhaul Template

## Knowledge Gaps
- **200 isolated node(s):** `name`, `version`, `type`, `bin`, `assets` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StudySession` connect `Calendar Planner & Grid` to `Co-Pilot & Subject Reports`, `Session History & Study Clock`, `Remote Supabase Sync`, `Chapter Details Drawer`, `Task Modals & Headers`, `Mock Exams & Presets`, `Study Time Analytics`, `Daily Study Analytics`, `Notification Center`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `Subject` connect `Task Modals & Headers` to `Co-Pilot & Subject Reports`, `Calendar Planner & Grid`, `Session History & Study Clock`, `Remote Supabase Sync`, `Chapter Details Drawer`, `Mock Exams & Presets`, `Daily Study Analytics`, `Notification Center`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `PlannerTask` connect `Calendar Planner & Grid` to `Co-Pilot & Subject Reports`, `Session History & Study Clock`, `Chapter Details Drawer`, `Task Modals & Headers`, `Notification Center`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `name`, `version`, `type` to the rest of the system?**
  _201 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Co-Pilot & Subject Reports` be split into smaller, more focused modules?**
  _Cohesion score 0.05223880597014925 - nodes in this community are weakly interconnected._
- **Should `Calendar Planner & Grid` be split into smaller, more focused modules?**
  _Cohesion score 0.0673903211216644 - nodes in this community are weakly interconnected._
- **Should `Session History & Study Clock` be split into smaller, more focused modules?**
  _Cohesion score 0.0574400723654455 - nodes in this community are weakly interconnected._