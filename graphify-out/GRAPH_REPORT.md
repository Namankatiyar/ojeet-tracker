# Graph Report - ojee-tracker  (2026-06-30)

## Corpus Check
- 184 files · ~138,180 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1113 nodes · 2117 edges · 71 communities (62 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e8c6396e`
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
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]

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

## Communities (71 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (43): CommunityPage(), CommunityTab, DisconnectModal(), DisconnectModalProps, InviteFriendModal(), InviteFriendModalProps, InviteHandler(), InviteSection() (+35 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (15): AppRoutesProps, ChangelogPage, CommunityPage, Dashboard, ImportSyncPage, InviteHandler, Planner, PrivacyPolicyPage (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (24): createLocalPayload(), UserProgressContextType, HeaderProps, buildSyncPayloadFromLocalStorage(), defaultProgress, defaultProgressCardSettings, defaultSubjectDataRecord, defaultSubjectStringMap (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (45): AddMockModal(), AddMockModalProps, createEmptySubjectMarks(), AnalyticsPanelsProps, ManageMockPresetsModal(), ManageMockPresetsModalProps, MockScoresPanel(), MockScoresPanelProps (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (41): SessionHistory(), StudyClock(), buildCountdownCompletionState(), buildNextPhaseState(), clampDeltaMs(), CountdownConfig, createIdleState(), CustomConfig (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (41): ChapterDetailDrawer(), ChapterDetailDrawerProps, confidenceColorsList, formatDateDisplay(), getConfidenceLabel(), todayString(), HoverPanelProps, LeftChapterRow (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (55): AGGREGATE_SELECT_COLUMNS, DEFAULT_DELTA_CURSOR, DeltaCursor, domainKeys, fetchRemotePayload(), getDomainEditedAt(), hasLocalUnsyncedEdit(), markAllDomainsAsSynced() (+47 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (38): AnalyticsPanels(), DashboardNotificationAction, DashboardNotificationCenter(), DashboardNotificationCenterProps, DashboardNotificationItem, TaskLog(), TaskLogProps, useRemoteSync() (+30 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (36): 3a: Generate the Brief, 3b: Generate the HTML/CSS Animation, Carousel-Specific Rules, CSS Animation Walkthrough Skill, Error Handling, Feature-Demo-Specific Rules, File Structure, Key states to inspect (+28 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (32): 10. Anti-Patterns (Banned Style Operations), 11. Quality Checklist, 1. Design Philosophy: Grounded in the Subject, 2.1 The Hero is a Thesis, 2.2 Typography with Personality, 2.3 Structure is Information, 2.4 Leverage Motion Deliberately, 2.5 Restraint: Spend Boldness in One Place (+24 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (29): [0.0.13](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.8...v0.0.13) (2026-02-02), [0.0.14](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.13...v0.0.14) (2026-02-02), [0.0.15] (2026-02-03), [0.0.15](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.14...v0.0.15) (2026-02-03), [0.0.16](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.7...v0.0.16) (2026-02-22), [0.0.17] (2026-02-22), [0.0.17](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.16...v0.0.17) (2026-02-22), [0.0.18](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.17...v0.0.18) (2026-02-22) (+21 more)

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
Cohesion: 0.09
Nodes (22): dependencies, boring-avatars, canvas-confetti, chart.js, express, @google/genai, html2canvas, @lottiefiles/dotlottie-react (+14 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (28): HoverPanel(), ExamCountdownModal(), ExamCountdownModalProps, InviteSectionProps, MonthCellComponent(), AppContent(), View, useAutoShiftTasks() (+20 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (17): 1. 📥 Installation, 2. 🔑 Configure Environment Variables, 3. ⚡ Start Development, 4. 📦 Build for Production, 🏗️ Architecture, 🌐 Community, 🛠️ Getting Started, 🚀 Key Features (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (9): CoPilotNudgeRow(), Dashboard(), DEFAULT_PLAYLIST, DEFAULT_TRACKS, MusicPlayerDrawer(), Playlist, Track, ReportsPage() (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (6): SubjectDataContext, SubjectDataProvider(), ChemistrySyllabus, JSONUnit, parseSubjectJSON(), SyllabusResponse

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (19): CalendarGrid(), CalendarGridProps, WEEKDAY_HEADERS, DayModal(), DayModalProps, formatStudyTime(), DayTile, DayTileComponent() (+11 more)

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
Cohesion: 0.17
Nodes (16): DashboardProps, PlannerProps, SessionHistoryProps, SessionStatisticsProps, StudyClockProps, subjectConfig, SubjectHeaderProps, TaskModal() (+8 more)

### Community 28 - "Community 28"
Cohesion: 0.36
Nodes (9): RemoteSyncProvider(), useSubjectData(), useUserProgress(), AppRoutes(), useAgentChat(), useAgentTools(), DAY_LABELS, useProfileSync() (+1 more)

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

### Community 39 - "Community 39"
Cohesion: 0.38
Nodes (5): initialProgress, mockMergedSubjectData, UserProgressContext, UserProgressProvider(), useProgress()

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): FINAL OUTPUT, GUIDELINES FOR THIS PROMPT, PHASE 1 — COMPONENT AUDIT, PHASE 2 — DIAGNOSIS, PHASE 3 — OVERHAUL PLAN

### Community 41 - "Community 41"
Cohesion: 0.20
Nodes (8): MonthCell, MonthCellProps, ImportSyncPageProps, OjeetSyncPayload, VALID_SUBJECTS, StudySession, SubjectStreak, SubtopicState

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
Cohesion: 0.18
Nodes (8): DayColumn(), DayColumnProps, Planner(), ViewMode, WeeklyView(), WeeklyViewProps, useDateNavigator(), usePlannerData()

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (3): [0.0.19](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.18...v0.0.19) (2026-02-23), Performance & Refactoring, UI & Styling

### Community 67 - "Community 67"
Cohesion: 0.24
Nodes (6): formatDuration(), SessionStatistics(), CustomSelect(), CustomSelectProps, Option, TimePicker

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (8): ChatSession, ConfirmActionPayload, getInitialSessions(), makeId(), makeMessage(), MessageRole, ChatTurn, buildAgentSystemPrompt()

### Community 69 - "Community 69"
Cohesion: 0.43
Nodes (6): DailyAnalytics(), formatDateDisplay(), formatHourLabel(), formatSmartDuration(), formatStatValue(), getLocalDateString()

### Community 70 - "Community 70"
Cohesion: 0.31
Nodes (3): CoPilotNudgeRowProps, CoPilotRecommendation, ConfidenceLevel

## Knowledge Gaps
- **473 isolated node(s):** `config`, `name`, `version`, `type`, `bin` (+468 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Subject` connect `Community 27` to `Community 1`, `Community 2`, `Community 67`, `Community 4`, `Community 69`, `Community 70`, `Community 7`, `Community 5`, `Community 6`, `Community 39`, `Community 3`, `Community 41`, `Community 19`, `Community 52`, `Community 22`, `Community 23`, `Community 28`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `StudySession` connect `Community 41` to `Community 0`, `Community 2`, `Community 3`, `Community 67`, `Community 69`, `Community 4`, `Community 7`, `Community 6`, `Community 39`, `Community 70`, `Community 52`, `Community 23`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `PlannerTask` connect `Community 23` to `Community 0`, `Community 2`, `Community 4`, `Community 70`, `Community 7`, `Community 39`, `Community 41`, `Community 19`, `Community 52`, `Community 27`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `config`, `name`, `version` to the rest of the system?**
  _473 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05583972719522592 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11695906432748537 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13227513227513227 - nodes in this community are weakly interconnected._