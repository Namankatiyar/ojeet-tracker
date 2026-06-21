# Graph Report - ojee-tracker  (2026-06-21)

## Corpus Check
- 147 files · ~90,853 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 959 nodes · 1779 edges · 74 communities (61 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0cdbc2e0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]

## God Nodes (most connected - your core abstractions)
1. `StudySession` - 41 edges
2. `Subject` - 40 edges
3. `PlannerTask` - 40 edges
4. `Changelog` - 31 edges
5. `formatDateLocal()` - 28 edges
6. `SubjectData` - 27 edges
7. `MockScore` - 23 edges
8. `useUserProgress()` - 20 edges
9. `useLocalStorage()` - 18 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `CSS Animation Walkthrough Skill` --semantically_similar_to--> `Component Specification Template`  [INFERRED] [semantically similar]
  .agents/skills/css-animation-skill/SKILL.md → .agents/prompts/ui-component-design.md
- `Premium Glassmorphism Styling Standard` --conceptually_related_to--> `OJEE Tracker Design Philosophy`  [INFERRED]
  DESIGN_SYSTEM.md → .agents/skills/ojee-tracker-design/SKILL.md
- `OJEE Tracker Design Philosophy` --conceptually_related_to--> `Project Overview & Agent Context`  [INFERRED]
  .agents/skills/ojee-tracker-design/SKILL.md → AGENTS.md
- `OJEE Tracker Design Philosophy` --rationale_for--> `Design Tokens & Constraints`  [INFERRED]
  .agents/skills/ojee-tracker-design/SKILL.md → DESIGN_SYSTEM.md
- `Dynamic Accent Color Engine` --conceptually_related_to--> `Design Tokens & Constraints`  [INFERRED]
  .agents/skills/ojee-tracker-design/SKILL.md → DESIGN_SYSTEM.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **UI Component Lifecycle and Walkthrough Standards** — prompts_ui_component_design_specification, prompts_ui_component_fix_auditreport, css_animation_skill_skill_walkthrough [INFERRED 0.85]
- **Design System and Styling Architecture Framework** — ojee_tracker_design_skill_philosophy, design_system_tokens, design_system_glassmorphism, ojee_tracker_design_skill_layers [INFERRED 0.95]
- **Project Documentation & Developer Context** — overview_technical, readme_project, agents_context [EXTRACTED 1.00]

## Communities (74 total, 13 thin omitted)

### Community 0 - "Co-Pilot & Subject Reports"
Cohesion: 0.20
Nodes (10): AppContent(), View, useAutoShiftTasks(), useDocumentMetadata(), useGlobalShortcuts(), Footer(), Header(), DiscordIcon() (+2 more)

### Community 1 - "Calendar Planner & Grid"
Cohesion: 0.06
Nodes (38): DailyAnalytics(), formatDateDisplay(), formatHourLabel(), formatSmartDuration(), formatStatValue(), getLocalDateString(), DayColumn(), DayColumnProps (+30 more)

### Community 2 - "Session History & Study Clock"
Cohesion: 0.06
Nodes (48): SessionHistory(), formatDuration(), SessionStatistics(), StudyClock(), buildCountdownCompletionState(), buildNextPhaseState(), clampDeltaMs(), CountdownConfig (+40 more)

### Community 3 - "Remote Supabase Sync"
Cohesion: 0.10
Nodes (23): AGGREGATE_SELECT_COLUMNS, DEFAULT_DELTA_CURSOR, DeltaCursor, domainKeys, getDomainEditedAt(), hasLocalUnsyncedEdit(), markAllDomainsAsSynced(), readCachedAggregate() (+15 more)

### Community 4 - "Chapter Details Drawer"
Cohesion: 0.08
Nodes (45): ChapterDetailDrawer(), ChapterDetailDrawerProps, confidenceColorsList, formatDateDisplay(), getConfidenceLabel(), todayString(), HoverPanel(), HoverPanelProps (+37 more)

### Community 5 - "Task Modals & Headers"
Cohesion: 0.33
Nodes (7): useSubjectData(), useTheme(), initialProgress, mockMergedSubjectData, UserProgressContext, UserProgressProvider(), useProgress()

### Community 6 - "Mock Exams & Presets"
Cohesion: 0.09
Nodes (39): AddMockModal(), AddMockModalProps, createEmptySubjectMarks(), AnalyticsPanelsProps, ManageMockPresetsModal(), ManageMockPresetsModalProps, MockScoresPanel(), MockScoresPanelProps (+31 more)

### Community 7 - "NPM Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, boring-avatars, canvas-confetti, chart.js, express, html2canvas, lucide-react, lz-string (+9 more)

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
Cohesion: 0.18
Nodes (11): MergeOptions, mergePayloadDomainsWithPolicy(), SyncDomain, EncodedPayload, EncodedPayloadChunked, EncodedPayloadInline, SYNC_SCHEMA_VERSION, SyncChunkRow (+3 more)

### Community 12 - "Developer Design Guidelines"
Cohesion: 0.13
Nodes (15): Project Overview & Agent Context, Subtopics Tracking & Chapter Workspace V2, Project Release Changelog, Supabase Delta Sync & Egress Optimization, Trigonometric Positioning Formulas, Premium Glassmorphism Styling Standard, Design Tokens & Constraints, Vite HTML Entrypoint & SEO Fallback (+7 more)

### Community 13 - "Dashboard Layout & Settings"
Cohesion: 0.33
Nodes (5): mockNavigate, mockResetPrompt, mockSignInWithGoogle, mockSignOut, mockSyncNow

### Community 14 - "Daily Study Analytics"
Cohesion: 0.14
Nodes (13): AppRoutes(), AppRoutesProps, ChangelogPage, Dashboard, ImportSyncPage, Planner, PrivacyPolicyPage, ReportsPage (+5 more)

### Community 15 - "Notification Center"
Cohesion: 0.18
Nodes (13): AnalyticsPanels(), Dashboard(), DashboardNotificationAction, DashboardNotificationCenter(), DashboardNotificationCenterProps, DashboardNotificationItem, TaskLog(), TaskLogProps (+5 more)

### Community 16 - "Remote User Authentication"
Cohesion: 0.22
Nodes (6): RemoteAuthContext, RemoteAuthContextType, RemoteAuthProvider(), isSupabaseConfigured, supabaseAnonKey, supabaseUrl

### Community 18 - "Google OAuth Sign-In"
Cohesion: 0.19
Nodes (8): CloudSyncPromptModal(), CloudSyncPromptModalProps, ConfirmationModal(), ConfirmationModalProps, GoogleSignInButton(), GoogleSignInButtonProps, SettingsModalProps, STORAGE_KEYS

### Community 19 - "Progress Bar & Ring"
Cohesion: 0.47
Nodes (4): ProgressBar(), ProgressBarProps, ProgressRing(), ProgressRingProps

### Community 21 - "Open Graph Assets"
Cohesion: 0.40
Nodes (5): OJEE Tracker Open Graph Image, Dashboard Layout UI, Vibrant Dark-Theme Glassmorphism Aesthetics, Mock Exam Scores Trend Line Chart, Weekly/Monthly Study Time Stacked Bar Chart

### Community 23 - "UI Styling Prompts"
Cohesion: 0.05
Nodes (38): 3a: Generate the Brief, 3b: Generate the HTML/CSS Animation, Carousel-Specific Rules, CSS Animation Walkthrough Skill, Error Handling, Feature-Demo-Specific Rules, File Structure, Key states to inspect (+30 more)

### Community 36 - "Community 36"
Cohesion: 0.06
Nodes (32): 10. Anti-Patterns (Banned Style Operations), 11. Quality Checklist, 1. Design Philosophy: Grounded in the Subject, 2.1 The Hero is a Thesis, 2.2 Typography with Personality, 2.3 Structure is Information, 2.4 Leverage Motion Deliberately, 2.5 Restraint: Spend Boldness in One Place (+24 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (26): [0.0.13](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.8...v0.0.13) (2026-02-02), [0.0.14](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.13...v0.0.14) (2026-02-02), [0.0.15] (2026-02-03), [0.0.16](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.7...v0.0.16) (2026-02-22), [0.0.17] (2026-02-22), [0.0.17](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.16...v0.0.17) (2026-02-22), [0.0.18](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.17...v0.0.18) (2026-02-22), [0.0.22](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.18...v0.0.22) (2026-02-26) (+18 more)

### Community 38 - "Community 38"
Cohesion: 0.07
Nodes (26): 1. Project Essence & Objective, 2. Technical Architecture, 3.1 ThemeContext, 3.2 SubjectDataContext, 3.3 UserProgressContext, 3. State Management (Context API), 4.1 Glassmorphism Engine, 4. Styling Strategy (+18 more)

### Community 39 - "Community 39"
Cohesion: 0.08
Nodes (39): CalendarGrid(), CalendarGridProps, WEEKDAY_HEADERS, DashboardProps, DayModal(), DayModalProps, formatStudyTime(), DayTile (+31 more)

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (3): 0.0.11 (2026-02-01), Added, Fixed

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (16): addToBucket(), AggregateBucketEntry, AggregateBucketMap, applyDeltaLogs(), buildBucketEntry(), computeLocalStudyAggregate(), computeSessionDelta(), getMonthKey() (+8 more)

### Community 42 - "Community 42"
Cohesion: 0.08
Nodes (24): 1. Design Philosophy: Grounded in the Subject, 2.1 Typography, 2.2 Strict Spacing Scale (4px Base), 2.3 Semantic Color System, 2.4 Border Radius, 2.5 Shadows & Glassmorphism, 2.6 Motion, 2. Design Tokens (+16 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (13): 🏗️ Architecture, ☁️ Cloud Synchronization, 📚 Dynamic Subject Management, 🚀 Features, 🛠️ Getting Started, 📱 Install as App (PWA), OJEE-Tracker, 💾 Persistence & Cloud Sync (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (11): 1. Anatomy, 2. Spacing & Sizing, 3. Colors (by state), 4. Interactive States, 5. Variants, 6. Responsive, 7. Animation (if any), 8. Edge Cases (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (9): 1. Project Overview, 2. Recent Implementation: Subtopics Tracking & Chapter Workspace (V2), 3. Recent Implementation: Daily Study Analytics & Bento Dashboard, Directory Structure, Key Implementations & Architecture, Layout & Architecture, Project Overview & Context: ojee-tracker, Tech Stack (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (9): [0.0.26](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.25...v0.0.26) (2026-03-01), Architectural Changes, Bug Fixes, Dependency Graph Changes, Features, Features, Risk Notes, State Changes (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, package, preview, release, release:dry (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.25
Nodes (8): [0.0.21] - 2026-02-27 00:15, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 49 - "Community 49"
Cohesion: 0.25
Nodes (8): [0.0.22] - 2026-02-27 00:30, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (8): [0.0.23] - 2026-02-28 13:40, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (8): [0.0.24] - 2026-02-28 15:30, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (8): [0.0.25] - 2026-03-01 22:50, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 53 - "Community 53"
Cohesion: 0.39
Nodes (7): createLocalPayload(), buildSyncPayload(), clampPlannerHistoryDays(), filterPlannerTasksForSync(), baseProgress, progressCardSettings, toSyncedProgressCardSettings()

### Community 54 - "Community 54"
Cohesion: 0.31
Nodes (6): SubjectDataProvider(), Theme, ThemeContext, ThemeContextType, ThemeProvider(), useLocalStorage()

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): bin, name, pkg, assets, targets, type, version

### Community 56 - "Community 56"
Cohesion: 0.33
Nodes (6): [0.0.27] – 2026-03-02 15:57, AI Maintenance Run, Architectural Changes, Feature-Level Changes, State Changes, Suggested ADR Entries

### Community 57 - "Community 57"
Cohesion: 0.33
Nodes (6): [1.0.4] – 2026-03-10, AI Maintenance Run: Egress Optimization & Delta Sync Integration, Architectural Changes, Documentation, Feature-Level Changes, State Changes

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (5): FINAL OUTPUT, GUIDELINES FOR THIS PROMPT, PHASE 1 — COMPONENT AUDIT, PHASE 2 — DIAGNOSIS, PHASE 3 — OVERHAUL PLAN

### Community 59 - "Community 59"
Cohesion: 0.31
Nodes (11): fetchRemotePayload(), compressSyncPayload(), computeChecksum(), decompressSyncPayload(), encoder, encodeSyncPayload(), fallbackFnv1aHex(), getUtf8ByteLength() (+3 more)

### Community 60 - "Community 60"
Cohesion: 0.40
Nodes (5): [0.0.20] - 2026-02-26 20:30, AI Maintenance Run, Architectural Changes, Feature-Level Changes, Suggested ADR Entries

### Community 61 - "Community 61"
Cohesion: 0.40
Nodes (5): 0.0.7 (2026-01-19), Added, Changed, Fixed, Removed

### Community 62 - "Community 62"
Cohesion: 0.50
Nodes (4): 0.0.8 (2026-01-31), Added, Changed, Fixed

### Community 63 - "Community 63"
Cohesion: 0.67
Nodes (3): 0.0.10 (2026-01-31), Added, Fixed

### Community 64 - "Community 64"
Cohesion: 0.44
Nodes (6): CoPilotNudgeRow(), CoPilotNudgeRowProps, ReportsPage(), CoPilotRecommendation, useStudyCoPilot(), ConfidenceLevel

### Community 65 - "Community 65"
Cohesion: 0.67
Nodes (3): 0.0.12 (2026-02-02), Added, Fixed

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (3): 0.0.13 (2026-02-02), Added, Fixed

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (3): PageMeta, routeMetadata, Window

### Community 68 - "Community 68"
Cohesion: 0.67
Nodes (3): [0.0.19](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.18...v0.0.19) (2026-02-23), Performance & Refactoring, UI & Styling

### Community 71 - "Community 71"
Cohesion: 0.25
Nodes (8): defaultMockExamPresets, buildSyncPayloadFromLocalStorage(), defaultProgress, defaultProgressCardSettings, defaultSubjectDataRecord, defaultSubjectStringMap, readJson(), SYNC_LOCAL_KEYS

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (5): SubjectDataContext, ChemistrySyllabus, JSONUnit, parseSubjectJSON(), SyllabusResponse

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (3): [0.0.15](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.14...v0.0.15) (2026-02-03), Bug Fixes, Features

## Knowledge Gaps
- **417 isolated node(s):** `name`, `version`, `type`, `bin`, `assets` (+412 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StudySession` connect `Mock Exams & Presets` to `Community 64`, `Calendar Planner & Grid`, `Session History & Study Clock`, `Remote Supabase Sync`, `Chapter Details Drawer`, `Task Modals & Headers`, `Community 39`, `Community 41`, `Notification Center`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Subject` connect `Community 39` to `Community 64`, `Calendar Planner & Grid`, `Session History & Study Clock`, `Co-Pilot & Subject Reports`, `Chapter Details Drawer`, `Task Modals & Headers`, `Mock Exams & Presets`, `Community 71`, `Community 72`, `Community 41`, `Study Time Analytics`, `Daily Study Analytics`, `Notification Center`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Changelog` connect `Community 37` to `Community 65`, `Community 66`, `Community 68`, `Community 40`, `Community 73`, `Community 46`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 56`, `Community 57`, `Community 60`, `Community 61`, `Community 62`, `Community 63`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `version`, `type` to the rest of the system?**
  _418 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Calendar Planner & Grid` be split into smaller, more focused modules?**
  _Cohesion score 0.06168831168831169 - nodes in this community are weakly interconnected._
- **Should `Session History & Study Clock` be split into smaller, more focused modules?**
  _Cohesion score 0.058653846153846154 - nodes in this community are weakly interconnected._
- **Should `Remote Supabase Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.09852216748768473 - nodes in this community are weakly interconnected._