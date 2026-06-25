# Graph Report - ojee-tracker  (2026-06-25)

## Corpus Check
- 174 files · ~106,578 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1098 nodes · 2087 edges · 87 communities (55 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bdf0c630`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Calendar and Planner UI|Calendar and Planner UI]]
- [[_COMMUNITY_Daily Analytics Dashboard|Daily Analytics Dashboard]]
- [[_COMMUNITY_Chapter Workspace & Detail Drawer|Chapter Workspace & Detail Drawer]]
- [[_COMMUNITY_Mock Exam Analytics & Modals|Mock Exam Analytics & Modals]]
- [[_COMMUNITY_Dashboard Feature Page|Dashboard Feature Page]]
- [[_COMMUNITY_Changelog and Releases|Changelog and Releases]]
- [[_COMMUNITY_Supabase Database & Peer Tables|Supabase Database & Peer Tables]]
- [[_COMMUNITY_Remote Sync & Context API|Remote Sync & Context API]]
- [[_COMMUNITY_CSS Animation Walkthrough Skill|CSS Animation Walkthrough Skill]]
- [[_COMMUNITY_Sync Payload & Compression|Sync Payload & Compression]]
- [[_COMMUNITY_Design System Philosophy|Design System Philosophy]]
- [[_COMMUNITY_Technical Overview & Core Contexts|Technical Overview & Core Contexts]]
- [[_COMMUNITY_Build and Linting Dependencies|Build and Linting Dependencies]]
- [[_COMMUNITY_TypeScript Compiler Options|TypeScript Compiler Options]]
- [[_COMMUNITY_PWA Service Worker & Updates|PWA Service Worker & Updates]]
- [[_COMMUNITY_External Libraries & Dependencies|External Libraries & Dependencies]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Project Setup & Features Readme|Project Setup & Features Readme]]
- [[_COMMUNITY_UI Component Design Guidelines|UI Component Design Guidelines]]
- [[_COMMUNITY_Reports Page & Subject Context|Reports Page & Subject Context]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_NPM Run Scripts|NPM Run Scripts]]
- [[_COMMUNITY_Package.json Targets & Binary Config|Package.json Targets & Binary Config]]
- [[_COMMUNITY_Vitest LocalStorage Mock Setup|Vitest LocalStorage Mock Setup]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_UI Component Fix Guidelines|UI Component Fix Guidelines]]
- [[_COMMUNITY_Changelog Page and Feed|Changelog Page and Feed]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_App Visual Layouts & Mockups|App Visual Layouts & Mockups]]
- [[_COMMUNITY_Egress Sync Optimization Docs|Egress Sync Optimization Docs]]
- [[_COMMUNITY_Deno Supabase Functions Imports|Deno Supabase Functions Imports]]
- [[_COMMUNITY_Progress Modal Performance Benchmarks|Progress Modal Performance Benchmarks]]
- [[_COMMUNITY_Bento Dashboard & Glassmorphism Spec|Bento Dashboard & Glassmorphism Spec]]
- [[_COMMUNITY_Chapter Workspace V2 Mechanics|Chapter Workspace V2 Mechanics]]
- [[_COMMUNITY_Study Session Trigger & Aggregates|Study Session Trigger & Aggregates]]
- [[_COMMUNITY_Dynamic Trigonometric Coordinates Spec|Dynamic Trigonometric Coordinates Spec]]
- [[_COMMUNITY_CORS Headers Utility|CORS Headers Utility]]
- [[_COMMUNITY_Design System Style Anti-Patterns|Design System Style Anti-Patterns]]
- [[_COMMUNITY_SVG Icons for Progress Indicators|SVG Icons for Progress Indicators]]
- [[_COMMUNITY_Graphify Graph Rules & Workflows|Graphify Graph Rules & Workflows]]
- [[_COMMUNITY_Vite Environment Definitions|Vite Environment Definitions]]
- [[_COMMUNITY_Vercel Deploy Routing Config|Vercel Deploy Routing Config]]
- [[_COMMUNITY_Vite Project Config|Vite Project Config]]
- [[_COMMUNITY_ojee-tracker Overview Docs|ojee-tracker Overview Docs]]
- [[_COMMUNITY_Database Live Activity Tracking|Database Live Activity Tracking]]
- [[_COMMUNITY_Database Peer Visibility Settings|Database Peer Visibility Settings]]
- [[_COMMUNITY_Database User Data Blobs Store|Database User Data Blobs Store]]
- [[_COMMUNITY_Changelog Manifest Release Tag|Changelog Manifest Release Tag]]
- [[_COMMUNITY_Design System Dynamic Accent Spec|Design System Dynamic Accent Spec]]
- [[_COMMUNITY_Design System Subject Colors Spec|Design System Subject Colors Spec]]
- [[_COMMUNITY_Design System Fluid Typography Spec|Design System Fluid Typography Spec]]
- [[_COMMUNITY_Main Index Root Markup|Main Index Root Markup]]
- [[_COMMUNITY_Index SEO Metadata Content|Index SEO Metadata Content]]
- [[_COMMUNITY_Aesthetic Accent Color Engine|Aesthetic Accent Color Engine]]
- [[_COMMUNITY_CSS Layers Styling Architecture|CSS Layers Styling Architecture]]
- [[_COMMUNITY_Strict Spacing Grid Specs|Strict Spacing Grid Specs]]
- [[_COMMUNITY_PNPM Monorepo Layout|PNPM Monorepo Layout]]
- [[_COMMUNITY_Indicator Icons System|Indicator Icons System]]
- [[_COMMUNITY_Shortcut Navigation Icons|Shortcut Navigation Icons]]
- [[_COMMUNITY_SEO Robots Exclusions Config|SEO Robots Exclusions Config]]
- [[_COMMUNITY_Graphify Update Automated Rules|Graphify Update Automated Rules]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 92|Community 92]]

## God Nodes (most connected - your core abstractions)
1. `StudySession` - 43 edges
2. `Subject` - 41 edges
3. `PlannerTask` - 41 edges
4. `Changelog` - 32 edges
5. `formatDateLocal()` - 30 edges
6. `SubjectData` - 27 edges
7. `useUserProgress()` - 26 edges
8. `useRemoteAuth()` - 23 edges
9. `useTheme()` - 23 edges
10. `MockScore` - 23 edges

## Surprising Connections (you probably didn't know these)
- `RemoteSyncContext` --shares_data_with--> ``study_session_log``  [INFERRED]
  src/core/context/RemoteSyncContext.tsx → BACKEND.md
- `RemoteAuthContext` --shares_data_with--> ``profiles``  [INFERRED]
  src/core/context/RemoteAuthContext.tsx → BACKEND.md
- `RemoteAuthContext` --calls--> `Supabase client`  [EXTRACTED]
  src/core/context/RemoteAuthContext.tsx → BACKEND.md
- `RemoteSyncContext` --shares_data_with--> ``user_sync_chunks``  [INFERRED]
  src/core/context/RemoteSyncContext.tsx → BACKEND.md
- `RemoteSyncContext` --shares_data_with--> ``user_sync_state``  [INFERRED]
  src/core/context/RemoteSyncContext.tsx → BACKEND.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offline-First Sync Flow** — context_remoteauthcontext_remoteauthcontext, context_remotesynccontext_remotesynccontext, backend_user_sync_state, backend_user_sync_chunks, lib_supabase_supabase [INFERRED 0.95]
- **Core Design Tokens System** — design_system_typography_monospace, design_system_typography_fluid_sizes, design_system_spacing_scale, design_system_dynamic_accent_system, design_system_glassmorphism [EXTRACTED 1.00]
- **Database Peer System Entities** — backend_profiles, backend_peer_relationships, backend_peer_visibility_settings, backend_live_activity, backend_are_users_peers [EXTRACTED 1.00]

## Communities (87 total, 32 thin omitted)

### Community 0 - "Calendar and Planner UI"
Cohesion: 0.11
Nodes (15): AnalyticsPanelsProps, CalendarGridProps, MonthCell, MonthCellProps, MonthlyViewProps, SessionHistoryProps, formatDuration(), SessionStatistics() (+7 more)

### Community 1 - "Daily Analytics Dashboard"
Cohesion: 0.06
Nodes (46): SessionHistory(), StudyClock(), buildCountdownCompletionState(), buildNextPhaseState(), clampDeltaMs(), CountdownConfig, createIdleState(), CustomConfig (+38 more)

### Community 2 - "Chapter Workspace & Detail Drawer"
Cohesion: 0.07
Nodes (41): ChapterDetailDrawerProps, HoverPanel(), HoverPanelProps, LeftChapterRow, LeftChapterRowProps, MiddleChapterRow, MiddleChapterRowProps, RightChapterRow (+33 more)

### Community 3 - "Mock Exam Analytics & Modals"
Cohesion: 0.10
Nodes (33): AddMockModal(), AddMockModalProps, createEmptySubjectMarks(), ManageMockPresetsModal(), ManageMockPresetsModalProps, MockScoresPanel(), MockScoresPanelProps, StudyTimePanel() (+25 more)

### Community 4 - "Dashboard Feature Page"
Cohesion: 0.13
Nodes (16): [0.0.22] - 2026-02-27 00:30, [0.0.26](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.25...v0.0.26) (2026-03-01), AI Maintenance Run, Architectural Changes, Architectural Changes, Bug Fixes, Dependency Graph Changes, Dependency Graph Changes (+8 more)

### Community 5 - "Changelog and Releases"
Cohesion: 0.10
Nodes (25): [0.0.13](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.8...v0.0.13) (2026-02-02), [0.0.14](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.13...v0.0.14) (2026-02-02), [0.0.15] (2026-02-03), [0.0.15](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.14...v0.0.15) (2026-02-03), [0.0.16](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.7...v0.0.16) (2026-02-22), [0.0.17] (2026-02-22), [0.0.17](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.16...v0.0.17) (2026-02-22), [0.0.22](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.18...v0.0.22) (2026-02-26) (+17 more)

### Community 6 - "Supabase Database & Peer Tables"
Cohesion: 0.18
Nodes (15): CalendarGrid(), WEEKDAY_HEADERS, DayModal(), DayModalProps, formatStudyTime(), DayTile, DayTileComponent(), DayTileProps (+7 more)

### Community 7 - "Remote Sync & Context API"
Cohesion: 0.06
Nodes (52): AGGREGATE_SELECT_COLUMNS, DEFAULT_DELTA_CURSOR, DeltaCursor, domainKeys, fetchRemotePayload(), getDomainEditedAt(), hasLocalUnsyncedEdit(), markAllDomainsAsSynced() (+44 more)

### Community 8 - "CSS Animation Walkthrough Skill"
Cohesion: 0.05
Nodes (38): 3a: Generate the Brief, 3b: Generate the HTML/CSS Animation, Carousel-Specific Rules, CSS Animation Walkthrough Skill, Error Handling, Feature-Demo-Specific Rules, File Structure, Key states to inspect (+30 more)

### Community 9 - "Sync Payload & Compression"
Cohesion: 0.24
Nodes (8): DAY_LABELS, formatLastSeen(), formatSmartDuration(), UserProfileCard(), UserProfileCardProps, FriendProfile, LiveActivity, RemoteProfile

### Community 10 - "Design System Philosophy"
Cohesion: 0.06
Nodes (32): 10. Anti-Patterns (Banned Style Operations), 11. Quality Checklist, 1. Design Philosophy: Grounded in the Subject, 2.1 The Hero is a Thesis, 2.2 Typography with Personality, 2.3 Structure is Information, 2.4 Leverage Motion Deliberately, 2.5 Restraint: Spend Boldness in One Place (+24 more)

### Community 11 - "Technical Overview & Core Contexts"
Cohesion: 0.07
Nodes (26): 1. Project Essence & Objective, 2. Technical Architecture, 3.1 ThemeContext, 3.2 SubjectDataContext, 3.3 UserProgressContext, 3. State Management (Context API), 4.1 Glassmorphism Engine, 4. Styling Strategy (+18 more)

### Community 12 - "Build and Linting Dependencies"
Cohesion: 0.09
Nodes (22): devDependencies, commit-and-tag-version, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom (+14 more)

### Community 13 - "TypeScript Compiler Options"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 14 - "PWA Service Worker & Updates"
Cohesion: 0.47
Nodes (4): InviteHandler(), generateColorsFromAccent(), UserAvatar(), UserAvatarProps

### Community 15 - "External Libraries & Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, boring-avatars, canvas-confetti, chart.js, express, html2canvas, lucide-react, lz-string (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (11): PlannerProps, StudyClockProps, TaskModal(), TaskModalProps, TaskType, useTaskForm(), UseTaskFormProps, AppProgress (+3 more)

### Community 18 - "Project Setup & Features Readme"
Cohesion: 0.14
Nodes (13): 🏗️ Architecture, ☁️ Cloud Synchronization, 📚 Dynamic Subject Management, 🚀 Features, 🛠️ Getting Started, 📱 Install as App (PWA), OJEE-Tracker, 💾 Persistence & Cloud Sync (+5 more)

### Community 19 - "UI Component Design Guidelines"
Cohesion: 0.17
Nodes (11): 1. Anatomy, 2. Spacing & Sizing, 3. Colors (by state), 4. Interactive States, 5. Variants, 6. Responsive, 7. Animation (if any), 8. Edge Cases (+3 more)

### Community 20 - "Reports Page & Subject Context"
Cohesion: 0.08
Nodes (24): Columns, Columns, Columns, Columns, Columns, Columns, Columns, Columns (+16 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (14): CommunityPage(), CommunityTab, DisconnectModal(), DisconnectModalProps, InviteSection(), InviteSectionProps, EXAM_OPTIONS, GRADE_OPTIONS (+6 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (30): AppContent(), View, AppRoutes(), AppRoutesProps, ChangelogPage, CommunityPage, Dashboard, ImportSyncPage (+22 more)

### Community 23 - "NPM Run Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, package, preview, release, release:dry (+1 more)

### Community 24 - "Package.json Targets & Binary Config"
Cohesion: 0.25
Nodes (7): bin, name, pkg, assets, targets, type, version

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (18): DashboardProps, UserProgressContextType, ACCENT_COLORS, HeaderProps, MergeOptions, mergePayloadDomainsWithPolicy(), EncodedPayloadChunked, EncodedPayloadInline (+10 more)

### Community 27 - "UI Component Fix Guidelines"
Cohesion: 0.33
Nodes (5): FINAL OUTPUT, GUIDELINES FOR THIS PROMPT, PHASE 1 — COMPONENT AUDIT, PHASE 2 — DIAGNOSIS, PHASE 3 — OVERHAUL PLAN

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (19): CoPilotNudgeRowProps, SubjectHeaderProps, SubjectDataContext, SubjectDataContextType, useSubjectData(), defaultMockExamPresets, initialProgress, mockMergedSubjectData (+11 more)

### Community 30 - "App Visual Layouts & Mockups"
Cohesion: 0.40
Nodes (5): OJEE Tracker Open Graph Image, Dashboard Layout UI, Vibrant Dark-Theme Glassmorphism Aesthetics, Mock Exam Scores Trend Line Chart, Weekly/Monthly Study Time Stacked Bar Chart

### Community 31 - "Egress Sync Optimization Docs"
Cohesion: 0.50
Nodes (4): Supabase Delta Sync & Egress Optimization, OJEE Tracker Technical Overview, OJEE Tracker Project Documentation, Supabase Sync Query Performance Analysis

### Community 32 - "Deno Supabase Functions Imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 34 - "Bento Dashboard & Glassmorphism Spec"
Cohesion: 0.67
Nodes (3): Bento Dashboard Layout, Glassmorphism & Depth System, 4px Spacing Scale

### Community 38 - "Study Session Trigger & Aggregates"
Cohesion: 0.07
Nodes (29): 10. Risks, Gaps, and Recommendations, 11. Backend Change Checklist, 12. Appendix: Backend Inventory, 1. Executive Summary, 2. Backend Surface Map, 3. Supabase Project Overview, 4. Database Schema, 5. Authentication and Authorization Model (+21 more)

### Community 52 - "Database User Data Blobs Store"
Cohesion: 0.11
Nodes (25): [0.0.20] - 2026-02-26 20:30, [0.0.24] - 2026-02-28 15:30, [0.0.27] – 2026-03-02 15:57, [1.0.4] – 2026-03-10, AI Maintenance Run, AI Maintenance Run, AI Maintenance Run, AI Maintenance Run: Egress Optimization & Delta Sync Integration (+17 more)

### Community 54 - "Design System Dynamic Accent Spec"
Cohesion: 0.08
Nodes (24): 1. Design Philosophy: Grounded in the Subject, 2.1 Typography, 2.2 Strict Spacing Scale (4px Base), 2.3 Semantic Color System, 2.4 Border Radius, 2.5 Shadows & Glassmorphism, 2.6 Motion, 2. Design Tokens (+16 more)

### Community 69 - "Community 69"
Cohesion: 0.11
Nodes (24): 0.0.10 (2026-01-31), 0.0.11 (2026-02-01), 0.0.12 (2026-02-02), 0.0.13 (2026-02-02), 0.0.7 (2026-01-19), 0.0.8 (2026-01-31), 0.0.9 (2026-01-31), Added (+16 more)

### Community 71 - "Community 71"
Cohesion: 0.13
Nodes (12): InviteFriendModal(), InviteFriendModalProps, AMOUNTS, SupportPage(), Theme, ThemeContext, ThemeContextType, ThemeProvider() (+4 more)

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (10): `are_users_peers` RPC, `handle_new_user_profile` Function, `peer_relationships` Table, `profiles`, RemoteAuthContext, RemoteAuthContextType, RemoteAuthProvider(), isSupabaseConfigured (+2 more)

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (3): ColorPickerModal(), ColorPickerModalProps, hslToHex()

### Community 75 - "Community 75"
Cohesion: 0.39
Nodes (4): Planner(), ViewMode, useDateNavigator(), usePlannerData()

### Community 76 - "Community 76"
Cohesion: 0.20
Nodes (9): 1. Project Overview, 2. Recent Implementation: Subtopics Tracking & Chapter Workspace (V2), 3. Recent Implementation: Daily Study Analytics & Bento Dashboard, Directory Structure, Key Implementations & Architecture, Layout & Architecture, Project Overview & Context: ojee-tracker, Tech Stack (+1 more)

### Community 77 - "Community 77"
Cohesion: 0.06
Nodes (45): ChapterDetailDrawer(), confidenceColorsList, formatDateDisplay(), getConfidenceLabel(), todayString(), Dashboard(), DashboardNotificationAction, DashboardNotificationCenter() (+37 more)

### Community 79 - "Community 79"
Cohesion: 0.19
Nodes (11): CoPilotNudgeRow(), DailyAnalytics(), formatDateDisplay(), formatHourLabel(), formatSmartDuration(), formatStatValue(), getLocalDateString(), ReportsPage() (+3 more)

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (8): [0.0.25] - 2026-03-01 22:50, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 81 - "Community 81"
Cohesion: 0.40
Nodes (5): [0.0.18](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.17...v0.0.18) (2026-02-22), [0.0.19](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.18...v0.0.19) (2026-02-23), Performance & Refactoring, Performance & Refactoring, UI & Styling

### Community 85 - "Community 85"
Cohesion: 0.25
Nodes (8): [0.0.21] - 2026-02-27 00:15, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 86 - "Community 86"
Cohesion: 0.25
Nodes (8): [0.0.23] - 2026-02-28 13:40, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 88 - "Community 88"
Cohesion: 0.17
Nodes (15): createLocalPayload(), buildSyncPayloadFromLocalStorage(), defaultProgress, defaultProgressCardSettings, defaultSubjectDataRecord, defaultSubjectStringMap, readJson(), SYNC_LOCAL_KEYS (+7 more)

### Community 89 - "Community 89"
Cohesion: 0.33
Nodes (4): CloudSyncPromptModal(), CloudSyncPromptModalProps, GoogleSignInButton(), GoogleSignInButtonProps

### Community 92 - "Community 92"
Cohesion: 0.19
Nodes (11): AnalyticsPanels(), useRemoteSync(), Supabase client, SettingsModal(), SettingsModalProps, STORAGE_KEYS, mockNavigate, mockResetPrompt (+3 more)

## Knowledge Gaps
- **465 isolated node(s):** `config`, `name`, `version`, `type`, `bin` (+460 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StudySession` connect `Calendar and Planner UI` to `Daily Analytics Dashboard`, `Mock Exam Analytics & Modals`, `Supabase Database & Peer Tables`, `Remote Sync & Context API`, `Sync Payload & Compression`, `Community 75`, `Community 77`, `Community 79`, `Community 17`, `Community 26`, `Community 29`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Subject` connect `Community 29` to `Calendar and Planner UI`, `Daily Analytics Dashboard`, `Chapter Workspace & Detail Drawer`, `Remote Sync & Context API`, `Community 75`, `Community 77`, `Community 79`, `Community 17`, `Community 22`, `Community 88`, `Community 26`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `RemoteSyncContext` connect `Study Session Trigger & Aggregates` to `Community 92`, `Remote Sync & Context API`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `config`, `name`, `version` to the rest of the system?**
  _469 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Calendar and Planner UI` be split into smaller, more focused modules?**
  _Cohesion score 0.11333333333333333 - nodes in this community are weakly interconnected._
- **Should `Daily Analytics Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.06229508196721312 - nodes in this community are weakly interconnected._
- **Should `Chapter Workspace & Detail Drawer` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._