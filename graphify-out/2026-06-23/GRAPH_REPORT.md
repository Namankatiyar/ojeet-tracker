# Graph Report - .  (2026-06-23)

## Corpus Check
- 35 files · ~95,302 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 896 nodes · 1702 edges · 69 communities (38 shown, 31 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_App Routing and Entry Pages|App Routing and Entry Pages]]
- [[_COMMUNITY_Support & Payments Gateway|Support & Payments Gateway]]
- [[_COMMUNITY_Project Setup & Features Readme|Project Setup & Features Readme]]
- [[_COMMUNITY_UI Component Design Guidelines|UI Component Design Guidelines]]
- [[_COMMUNITY_Reports Page & Subject Context|Reports Page & Subject Context]]
- [[_COMMUNITY_App Root & Global Shortcuts|App Root & Global Shortcuts]]
- [[_COMMUNITY_User Progress & Local State|User Progress & Local State]]
- [[_COMMUNITY_NPM Run Scripts|NPM Run Scripts]]
- [[_COMMUNITY_Package.json Targets & Binary Config|Package.json Targets & Binary Config]]
- [[_COMMUNITY_Vitest LocalStorage Mock Setup|Vitest LocalStorage Mock Setup]]
- [[_COMMUNITY_SEO & Document Metadata Hook|SEO & Document Metadata Hook]]
- [[_COMMUNITY_UI Component Fix Guidelines|UI Component Fix Guidelines]]
- [[_COMMUNITY_Changelog Page and Feed|Changelog Page and Feed]]
- [[_COMMUNITY_Study Co-Pilot Nudges|Study Co-Pilot Nudges]]
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

## God Nodes (most connected - your core abstractions)
1. `PlannerTask` - 39 edges
2. `StudySession` - 38 edges
3. `Subject` - 36 edges
4. `Changelog` - 31 edges
5. `SubjectData` - 26 edges
6. `formatDateLocal()` - 26 edges
7. `MockScore` - 21 edges
8. `useUserProgress()` - 20 edges
9. `compilerOptions` - 18 edges
10. `useLocalStorage()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `RemoteSyncContext` --shares_data_with--> ``study_session_log` Table`  [INFERRED]
  src/core/context/RemoteSyncContext.tsx → BACKEND.md
- `RemoteSyncContext` --shares_data_with--> ``user_sync_chunks` Table`  [INFERRED]
  src/core/context/RemoteSyncContext.tsx → BACKEND.md
- `RemoteAuthContext` --shares_data_with--> ``profiles` Table`  [INFERRED]
  src/core/context/RemoteAuthContext.tsx → BACKEND.md
- `RemoteSyncContext` --shares_data_with--> ``user_sync_state` Table`  [INFERRED]
  src/core/context/RemoteSyncContext.tsx → BACKEND.md
- `RemoteAuthContext` --calls--> `Supabase client`  [EXTRACTED]
  src/core/context/RemoteAuthContext.tsx → BACKEND.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offline-First Sync Flow** — context_remoteauthcontext_remoteauthcontext, context_remotesynccontext_remotesynccontext, backend_user_sync_state, backend_user_sync_chunks, lib_supabase_supabase [INFERRED 0.95]
- **Core Design Tokens System** — design_system_typography_monospace, design_system_typography_fluid_sizes, design_system_spacing_scale, design_system_dynamic_accent_system, design_system_glassmorphism [EXTRACTED 1.00]
- **Database Peer System Entities** — backend_profiles, backend_peer_relationships, backend_peer_visibility_settings, backend_live_activity, backend_are_users_peers [EXTRACTED 1.00]

## Communities (69 total, 31 thin omitted)

### Community 0 - "Calendar and Planner UI"
Cohesion: 0.06
Nodes (56): CalendarGrid(), CalendarGridProps, WEEKDAY_HEADERS, DashboardProps, DayModal(), DayModalProps, formatStudyTime(), DayTile (+48 more)

### Community 1 - "Daily Analytics Dashboard"
Cohesion: 0.05
Nodes (54): DailyAnalytics(), formatDateDisplay(), formatHourLabel(), formatSmartDuration(), formatStatValue(), getLocalDateString(), SessionHistory(), formatDuration() (+46 more)

### Community 2 - "Chapter Workspace & Detail Drawer"
Cohesion: 0.06
Nodes (47): ChapterDetailDrawer(), ChapterDetailDrawerProps, confidenceColorsList, formatDateDisplay(), getConfidenceLabel(), todayString(), HoverPanel(), HoverPanelProps (+39 more)

### Community 3 - "Mock Exam Analytics & Modals"
Cohesion: 0.09
Nodes (40): AddMockModal(), AddMockModalProps, createEmptySubjectMarks(), AnalyticsPanelsProps, ManageMockPresetsModal(), ManageMockPresetsModalProps, MockScoresPanel(), MockScoresPanelProps (+32 more)

### Community 4 - "Dashboard Feature Page"
Cohesion: 0.07
Nodes (34): Dashboard(), DashboardNotificationAction, DashboardNotificationCenter(), DashboardNotificationCenterProps, DashboardNotificationItem, DayColumn(), DayColumnProps, ExamCountdownModal() (+26 more)

### Community 5 - "Changelog and Releases"
Cohesion: 0.10
Nodes (49): 0.0.10 (2026-01-31), 0.0.11 (2026-02-01), 0.0.12 (2026-02-02), 0.0.13 (2026-02-02), [0.0.13](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.8...v0.0.13) (2026-02-02), [0.0.14](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.13...v0.0.14) (2026-02-02), [0.0.15] (2026-02-03), [0.0.15](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.14...v0.0.15) (2026-02-03) (+41 more)

### Community 6 - "Supabase Database & Peer Tables"
Cohesion: 0.05
Nodes (38): `are_users_peers` RPC, `handle_new_user_profile` Function, `peer_relationships` Table, `profiles` Table, `set_updated_at` Trigger, `study_session_log` Table, `trigger_prune_orphaned_chunks` Trigger, `trigger_prune_stale_session_logs` Trigger (+30 more)

### Community 7 - "Remote Sync & Context API"
Cohesion: 0.07
Nodes (37): AGGREGATE_SELECT_COLUMNS, DEFAULT_DELTA_CURSOR, DeltaCursor, domainKeys, getDomainEditedAt(), hasLocalUnsyncedEdit(), markAllDomainsAsSynced(), readCachedAggregate() (+29 more)

### Community 8 - "CSS Animation Walkthrough Skill"
Cohesion: 0.05
Nodes (38): 3a: Generate the Brief, 3b: Generate the HTML/CSS Animation, Carousel-Specific Rules, CSS Animation Walkthrough Skill, Error Handling, Feature-Demo-Specific Rules, File Structure, Key states to inspect (+30 more)

### Community 9 - "Sync Payload & Compression"
Cohesion: 0.10
Nodes (26): compressSyncPayload(), computeChecksum(), decompressSyncPayload(), encoder, encodeSyncPayload(), fallbackFnv1aHex(), getUtf8ByteLength(), reconstructCompressedPayload() (+18 more)

### Community 10 - "Design System Philosophy"
Cohesion: 0.06
Nodes (32): 10. Anti-Patterns (Banned Style Operations), 11. Quality Checklist, 1. Design Philosophy: Grounded in the Subject, 2.1 The Hero is a Thesis, 2.2 Typography with Personality, 2.3 Structure is Information, 2.4 Leverage Motion Deliberately, 2.5 Restraint: Spend Boldness in One Place (+24 more)

### Community 11 - "Technical Overview & Core Contexts"
Cohesion: 0.07
Nodes (26): 1. Project Essence & Objective, 2. Technical Architecture, 3.1 ThemeContext, 3.2 SubjectDataContext, 3.3 UserProgressContext, 3. State Management (Context API), 4.1 Glassmorphism Engine, 4. Styling Strategy (+18 more)

### Community 12 - "Build and Linting Dependencies"
Cohesion: 0.08
Nodes (24): devDependencies, commit-and-tag-version, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom (+16 more)

### Community 13 - "TypeScript Compiler Options"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 14 - "PWA Service Worker & Updates"
Cohesion: 0.17
Nodes (14): PwaUpdateBanner(), applyPwaUpdate(), CACHE_PREFIXES_TO_CLEAR, cleanupLegacyCachesOnce(), dismissUpdateNotice(), getPwaBridgeState(), initPwaBridge(), listeners (+6 more)

### Community 15 - "External Libraries & Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, boring-avatars, canvas-confetti, chart.js, express, html2canvas, lucide-react, lz-string (+10 more)

### Community 16 - "App Routing and Entry Pages"
Cohesion: 0.12
Nodes (13): AppRoutesProps, ChangelogPage, Dashboard, ImportSyncPage, Planner, PrivacyPolicyPage, ReportsPage, StudyClock (+5 more)

### Community 17 - "Support & Payments Gateway"
Cohesion: 0.14
Nodes (8): AMOUNTS, SupportPage(), Theme, ThemeContext, ThemeContextType, ThemeProvider(), useTheme(), AppContent()

### Community 18 - "Project Setup & Features Readme"
Cohesion: 0.14
Nodes (13): 🏗️ Architecture, ☁️ Cloud Synchronization, 📚 Dynamic Subject Management, 🚀 Features, 🛠️ Getting Started, 📱 Install as App (PWA), OJEE-Tracker, 💾 Persistence & Cloud Sync (+5 more)

### Community 19 - "UI Component Design Guidelines"
Cohesion: 0.17
Nodes (11): 1. Anatomy, 2. Spacing & Sizing, 3. Colors (by state), 4. Interactive States, 5. Variants, 6. Responsive, 7. Animation (if any), 8. Edge Cases (+3 more)

### Community 20 - "Reports Page & Subject Context"
Cohesion: 0.27
Nodes (7): CoPilotNudgeRow(), ReportsPage(), SubjectDataContext, SubjectDataContextType, SubjectDataProvider(), useLocalStorage(), useStudyCoPilot()

### Community 21 - "App Root & Global Shortcuts"
Cohesion: 0.22
Nodes (7): View, useAutoShiftTasks(), useGlobalShortcuts(), Footer(), DiscordIcon(), DiscordInviteModal(), DiscordInviteModalProps

### Community 22 - "User Progress & Local State"
Cohesion: 0.24
Nodes (8): useSubjectData(), initialProgress, mockMergedSubjectData, UserProgressContext, UserProgressContextType, UserProgressProvider(), AppRoutes(), useProgress()

### Community 23 - "NPM Run Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, package, preview, release, release:dry (+1 more)

### Community 24 - "Package.json Targets & Binary Config"
Cohesion: 0.25
Nodes (7): bin, name, pkg, assets, targets, type, version

### Community 26 - "SEO & Document Metadata Hook"
Cohesion: 0.29
Nodes (4): PageMeta, routeMetadata, useDocumentMetadata(), Window

### Community 27 - "UI Component Fix Guidelines"
Cohesion: 0.33
Nodes (5): FINAL OUTPUT, GUIDELINES FOR THIS PROMPT, PHASE 1 — COMPONENT AUDIT, PHASE 2 — DIAGNOSIS, PHASE 3 — OVERHAUL PLAN

### Community 29 - "Study Co-Pilot Nudges"
Cohesion: 0.80
Nodes (3): CoPilotNudgeRowProps, CoPilotRecommendation, ConfidenceLevel

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

## Knowledge Gaps
- **338 isolated node(s):** `RemoteAuthContextType`, `Window`, `PageMeta`, `routeMetadata`, `DashboardNotificationAction` (+333 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StudySession` connect `Calendar and Planner UI` to `Daily Analytics Dashboard`, `Mock Exam Analytics & Modals`, `Dashboard Feature Page`, `Supabase Database & Peer Tables`, `Remote Sync & Context API`, `User Progress & Local State`, `Study Co-Pilot Nudges`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Subject` connect `Calendar and Planner UI` to `Daily Analytics Dashboard`, `Chapter Workspace & Detail Drawer`, `Mock Exam Analytics & Modals`, `Dashboard Feature Page`, `Supabase Database & Peer Tables`, `Remote Sync & Context API`, `Sync Payload & Compression`, `App Routing and Entry Pages`, `Reports Page & Subject Context`, `App Root & Global Shortcuts`, `User Progress & Local State`, `Study Co-Pilot Nudges`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `PlannerTask` connect `Calendar and Planner UI` to `Daily Analytics Dashboard`, `Mock Exam Analytics & Modals`, `Dashboard Feature Page`, `Sync Payload & Compression`, `User Progress & Local State`, `Study Co-Pilot Nudges`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `RemoteAuthContextType`, `Window`, `PageMeta` to the rest of the system?**
  _342 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Calendar and Planner UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05740740740740741 - nodes in this community are weakly interconnected._
- **Should `Daily Analytics Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.050351721584598295 - nodes in this community are weakly interconnected._
- **Should `Chapter Workspace & Detail Drawer` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._