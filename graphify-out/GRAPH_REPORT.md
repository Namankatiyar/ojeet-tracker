# Graph Report - ojee-tracker  (2026-06-28)

## Corpus Check
- 183 files · ~126,421 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1101 nodes · 2099 edges · 66 communities (57 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3dbf30a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
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
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]

## God Nodes (most connected - your core abstractions)
1. `StudySession` - 46 edges
2. `Subject` - 44 edges
3. `PlannerTask` - 44 edges
4. `Changelog` - 31 edges
5. `useUserProgress()` - 30 edges
6. `formatDateLocal()` - 29 edges
7. `SubjectData` - 27 edges
8. `MockScore` - 25 edges
9. `useRemoteAuth()` - 23 edges
10. `useTheme()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `createClient()`  [INFERRED]
  api/invite-image.js → src/shared/lib/gemini.ts
- `handler()` --calls--> `createClient()`  [INFERRED]
  api/invite-page.js → src/shared/lib/gemini.ts
- `ProfileEditModalProps` --references--> `ProgressCardSettings`  [EXTRACTED]
  src/features/community/components/ProfileEditModal.tsx → src/shared/types/index.ts
- `ExamCountdownModalProps` --references--> `ExamEntry`  [EXTRACTED]
  src/features/dashboard/components/ExamCountdownModal.tsx → src/shared/types/index.ts
- `StudyTimePanelProps` --references--> `StudySession`  [EXTRACTED]
  src/features/dashboard/components/StudyTimePanel.tsx → src/shared/types/index.ts

## Import Cycles
- None detected.

## Communities (66 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (45): CommunityPage(), CommunityTab, DisconnectModal(), DisconnectModalProps, InviteFriendModal(), InviteFriendModalProps, InviteHandler(), InviteSection() (+37 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (48): CoPilotNudgeRow(), CoPilotNudgeRowProps, DailyAnalytics(), formatDateDisplay(), formatHourLabel(), formatSmartDuration(), formatStatValue(), getLocalDateString() (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (29): ManageMockPresetsModal(), ManageMockPresetsModalProps, createLocalPayload(), defaultMockExamPresets, initialProgress, mockMergedSubjectData, UserProgressContext, UserProgressContextType (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (31): AddMockModal(), AddMockModalProps, createEmptySubjectMarks(), AnalyticsPanelsProps, MockScoresPanel(), MockScoresPanelProps, useMockScoresAnalytics(), ACCENT_COLORS (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (46): formatDuration(), SessionStatistics(), SessionStatisticsProps, StudyClock(), buildCountdownCompletionState(), buildNextPhaseState(), clampDeltaMs(), CountdownConfig (+38 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (46): ChapterDetailDrawer(), ChapterDetailDrawerProps, confidenceColorsList, formatDateDisplay(), getConfidenceLabel(), todayString(), HoverPanel(), HoverPanelProps (+38 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (57): AGGREGATE_SELECT_COLUMNS, DEFAULT_DELTA_CURSOR, DeltaCursor, domainKeys, fetchRemotePayload(), getDomainEditedAt(), hasLocalUnsyncedEdit(), markAllDomainsAsSynced() (+49 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (35): AnalyticsPanels(), Dashboard(), DashboardNotificationAction, DashboardNotificationCenter(), DashboardNotificationCenterProps, DashboardNotificationItem, TaskLog(), TaskLogProps (+27 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (36): 3a: Generate the Brief, 3b: Generate the HTML/CSS Animation, Carousel-Specific Rules, CSS Animation Walkthrough Skill, Error Handling, Feature-Demo-Specific Rules, File Structure, Key states to inspect (+28 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (32): 10. Anti-Patterns (Banned Style Operations), 11. Quality Checklist, 1. Design Philosophy: Grounded in the Subject, 2.1 The Hero is a Thesis, 2.2 Typography with Personality, 2.3 Structure is Information, 2.4 Leverage Motion Deliberately, 2.5 Restraint: Spend Boldness in One Place (+24 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (26): [0.0.13](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.8...v0.0.13) (2026-02-02), [0.0.14](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.13...v0.0.14) (2026-02-02), [0.0.15] (2026-02-03), [0.0.16](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.7...v0.0.16) (2026-02-22), [0.0.17] (2026-02-22), [0.0.17](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.16...v0.0.17) (2026-02-22), [0.0.18](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.17...v0.0.18) (2026-02-22), [0.0.22](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.18...v0.0.22) (2026-02-26) (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (26): 1. Project Essence & Objective, 2. Technical Architecture, 3.1 ThemeContext, 3.2 SubjectDataContext, 3.3 UserProgressContext, 3. State Management (Context API), 4.1 Glassmorphism Engine, 4. Styling Strategy (+18 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (21): config, handler(), handler(), replaceMeta(), ApiKeyPanel(), ApiKeyPanelProps, BubbleProps, ChatDrawer() (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (25): 10. Risks, Gaps, and Recommendations, 11. Backend Change Checklist, 12. Appendix: Backend Inventory, 1. Executive Summary, 2. Backend Surface Map, 3. Supabase Project Overview, 4. Database Schema, 5. Authentication and Authorization Model (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (24): 1. Design Philosophy: Grounded in the Subject, 2.1 Typography, 2.2 Strict Spacing Scale (4px Base), 2.3 Semantic Color System, 2.4 Border Radius, 2.5 Shadows & Glassmorphism, 2.6 Motion, 2. Design Tokens (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (24): Columns, Columns, Columns, Columns, Columns, Columns, Columns, Columns (+16 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (24): devDependencies, commit-and-tag-version, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+16 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (21): dependencies, boring-avatars, canvas-confetti, chart.js, express, @google/genai, html2canvas, @lottiefiles/dotlottie-react (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (11): DayColumn(), DayColumnProps, DayTile, DayTileComponent(), DayTileProps, formatStudyTime(), HoverPanelProps, SUBJECT_COLORS (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (17): 1. 📥 Installation, 2. 🔑 Configure Environment Variables, 3. ⚡ Start Development, 4. 📦 Build for Production, 🏗️ Architecture, 🌐 Community, 🛠️ Getting Started, 🚀 Key Features (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (36): ExamCountdownModal(), ExamCountdownModalProps, StudyTimePanel(), StudyTimePanelProps, StudyViewMode, AppContent(), View, useAutoShiftTasks() (+28 more)

### Community 22 - "Community 22"
Cohesion: 0.47
Nodes (4): ProgressBar(), ProgressBarProps, ProgressRing(), ProgressRingProps

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (8): CalendarGrid(), WEEKDAY_HEADERS, DayModal(), DayModalProps, formatStudyTime(), MonthlyView(), DayData, useMonthlyData()

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (11): 1. Anatomy, 2. Spacing & Sizing, 3. Colors (by state), 4. Interactive States, 5. Variants, 6. Responsive, 7. Animation (if any), 8. Edge Cases (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (11): scripts, build, dev, format, format:check, lint, package, preview (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (9): 1. Project Overview, 2. Recent Implementation: Subtopics Tracking & Chapter Workspace (V2), 3. Recent Implementation: Daily Study Analytics & Bento Dashboard, Directory Structure, Key Implementations & Architecture, Layout & Architecture, Project Overview & Context: ojee-tracker, Tech Stack (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (16): SessionHistory(), SessionHistoryProps, StudyClockProps, subjectConfig, SubjectHeader(), SubjectHeaderProps, TaskModal(), TaskModalProps (+8 more)

### Community 28 - "Community 28"
Cohesion: 0.31
Nodes (4): Planner(), ViewMode, useDateNavigator(), usePlannerData()

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (9): [0.0.26](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.25...v0.0.26) (2026-03-01), Architectural Changes, Bug Fixes, Dependency Graph Changes, Features, Features, Risk Notes, State Changes (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (8): [0.0.21] - 2026-02-27 00:15, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (8): [0.0.22] - 2026-02-27 00:30, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (8): [0.0.23] - 2026-02-28 13:40, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (8): [0.0.24] - 2026-02-28 15:30, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (8): [0.0.25] - 2026-03-01 22:50, AI Maintenance Run, Architectural Changes, Dependency Graph Changes, Feature-Level Changes, Risk Notes, State Changes, Suggested ADR Entries

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (7): bin, name, pkg, assets, targets, type, version

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (6): [0.0.27] – 2026-03-02 15:57, AI Maintenance Run, Architectural Changes, Feature-Level Changes, State Changes, Suggested ADR Entries

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (6): [1.0.4] – 2026-03-10, AI Maintenance Run: Egress Optimization & Delta Sync Integration, Architectural Changes, Documentation, Feature-Level Changes, State Changes

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): FINAL OUTPUT, GUIDELINES FOR THIS PROMPT, PHASE 1 — COMPONENT AUDIT, PHASE 2 — DIAGNOSIS, PHASE 3 — OVERHAUL PLAN

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (12): CalendarGridProps, DashboardProps, MonthCell, MonthCellComponent(), MonthCellProps, MonthlyViewProps, PlannerProps, ImportSyncPageProps (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (5): [0.0.20] - 2026-02-26 20:30, AI Maintenance Run, Architectural Changes, Feature-Level Changes, Suggested ADR Entries

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (5): 0.0.7 (2026-01-19), Added, Changed, Fixed, Removed

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (4): 0.0.8 (2026-01-31), Added, Changed, Fixed

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (3): 0.0.10 (2026-01-31), Added, Fixed

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (3): 0.0.11 (2026-02-01), Added, Fixed

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (3): 0.0.12 (2026-02-02), Added, Fixed

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (3): 0.0.13 (2026-02-02), Added, Fixed

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (3): [0.0.15](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.14...v0.0.15) (2026-02-03), Bug Fixes, Features

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (3): [0.0.19](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.18...v0.0.19) (2026-02-23), Performance & Refactoring, UI & Styling

## Knowledge Gaps
- **468 isolated node(s):** `config`, `name`, `version`, `type`, `bin` (+463 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Subject` connect `Community 1` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 41`, `Community 21`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `StudySession` connect `Community 41` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 21`, `Community 23`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `formatDateLocal()` connect `Community 21` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 41`, `Community 19`, `Community 23`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `config`, `name`, `version` to the rest of the system?**
  _468 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05359937402190924 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05829420970266041 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09841269841269841 - nodes in this community are weakly interconnected._