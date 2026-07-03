# Graph Report - ojee-tracker  (2026-07-03)

## Corpus Check
- 222 files · ~285,375 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1514 nodes · 2635 edges · 94 communities (83 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `31592538`
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
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]

## God Nodes (most connected - your core abstractions)
1. `StudySession` - 47 edges
2. `Subject` - 46 edges
3. `PlannerTask` - 45 edges
4. `useUserProgress()` - 39 edges
5. `Changelog` - 31 edges
6. `formatDateLocal()` - 30 edges
7. `useRemoteAuth()` - 29 edges
8. `SubjectData` - 27 edges
9. `MockScore` - 26 edges
10. `useTheme()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `createClient()`  [INFERRED]
  api/invite-image.js → src/shared/lib/gemini.ts
- `handler()` --calls--> `createClient()`  [INFERRED]
  api/invite-page.js → src/shared/lib/gemini.ts
- `StudySessionContextType` --references--> `StudySession`  [EXTRACTED]
  src/core/context/UserProgressContext.tsx → src/shared/types/index.ts
- `SettingsContextType` --references--> `ProgressCardSettings`  [EXTRACTED]
  src/core/context/UserProgressContext.tsx → src/shared/types/index.ts
- `ProfileEditModalProps` --references--> `ProgressCardSettings`  [EXTRACTED]
  src/features/community/components/ProfileEditModal.tsx → src/shared/types/index.ts

## Import Cycles
- None detected.

## Communities (94 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (15): 1. Switch to Mobile-First Breakpoints, 2. Flex/Grid Column Stacking, 3. Remove Fixed Widths & Use Spacing Tokens, 4. Typography Scale, 5. Modals and Overlays, 6. Mobile Glassmorphism Fallback, Layout Breakage Patterns to Catch, Mobile Responsive Refactor Skill (ojee-tracker variant) (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (15): AppRoutesProps, ChangelogPage, CommunityPage, Dashboard, ImportSyncPage, InviteHandler, Planner, PrivacyPolicyPage (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (16): createLocalPayload(), buildSyncPayloadFromLocalStorage(), defaultProgress, defaultProgressCardSettings, defaultSubjectDataRecord, defaultSubjectStringMap, readJson(), SYNC_LOCAL_KEYS (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (33): AddMockModal(), AddMockModalProps, createEmptySubjectMarks(), AnalyticsPanels(), AnalyticsPanelsProps, MockScoresPanel(), MockScoresPanelProps, StudyTimePanel() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (42): StudyClock(), buildCountdownCompletionState(), buildNextPhaseState(), clampDeltaMs(), CountdownConfig, createIdleState(), CustomConfig, CustomInterval (+34 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (47): ChapterDetailDrawer(), ChapterDetailDrawerProps, confidenceColorsList, formatDateDisplay(), getConfidenceLabel(), SubtopicRow, SubtopicRowProps, todayString() (+39 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (54): AGGREGATE_SELECT_COLUMNS, DEFAULT_DELTA_CURSOR, DeltaCursor, domainKeys, fetchRemotePayload(), getDomainEditedAt(), hasLocalUnsyncedEdit(), markAllDomainsAsSynced() (+46 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (33): Dashboard(), DashboardNotificationAction, DashboardNotificationCenter(), DashboardNotificationCenterProps, DashboardNotificationItem, DayColumn(), ExamCountdownModal(), ExamCountdownModalProps (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (36): 3a: Generate the Brief, 3b: Generate the HTML/CSS Animation, Carousel-Specific Rules, CSS Animation Walkthrough Skill, Error Handling, Feature-Demo-Specific Rules, File Structure, Key states to inspect (+28 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (33): 10. Anti-Patterns (Banned Style Operations), 11. Quality Checklist, 1. Design Philosophy: Grounded in the Subject, 2.1 The Hero is a Thesis, 2.2 Typography with Personality, 2.3 Structure is Information, 2.4 Leverage Motion Deliberately, 2.5 Restraint: Spend Boldness in One Place (+25 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (32): 0.0.10 (2026-01-31), [0.0.13](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.8...v0.0.13) (2026-02-02), [0.0.14](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.13...v0.0.14) (2026-02-02), [0.0.15] (2026-02-03), [0.0.16](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.7...v0.0.16) (2026-02-22), [0.0.17] (2026-02-22), [0.0.17](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.16...v0.0.17) (2026-02-22), [0.0.18](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.17...v0.0.18) (2026-02-22) (+24 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (27): ..., 1. Project Essence & Objective, 2. Technical Architecture, 3.1 ThemeContext, 3.2 SubjectDataContext, 3.3 UserProgressContext, 3. State Management (Context API), 4.1 Glassmorphism Engine (+19 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (21): config, handler(), handler(), replaceMeta(), ApiKeyPanel(), ApiKeyPanelProps, BubbleProps, ChatDrawer() (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (27): 10. Risks, Gaps, and Recommendations, 11. Backend Change Checklist, 12. Appendix: Backend Inventory, 1. Executive Summary, 2. Backend Surface Map, 3. Supabase Project Overview, 4. Database Schema, 5. Authentication and Authorization Model (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (24): 1. Design Philosophy: Grounded in the Subject, 2.1 Typography, 2.2 Strict Spacing Scale (4px Base), 2.3 Semantic Color System, 2.4 Border Radius, 2.5 Shadows, Glassmorphism & Metallic Boundaries, 2.6 Motion, 2. Design Tokens (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (39): Columns, Columns, Columns, Columns, Columns, Columns, Columns, Columns (+31 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (24): devDependencies, commit-and-tag-version, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+16 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (23): dependencies, boring-avatars, canvas-confetti, chart.js, express, framer-motion, @google/genai, html2canvas (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (20): InviteSection(), InviteSectionProps, AppContent(), ChatDrawer, MusicPlayerDrawer, OnboardingFlow, ProfileSyncManager(), View (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (17): 1. 📥 Installation, 2. 🔑 Configure Environment Variables, 3. ⚡ Start Development, 4. 📦 Build for Production, 🏗️ Architecture, 🌐 Community, 🛠️ Getting Started, 🚀 Key Features (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.20
Nodes (10): defaultMockExamPresets, initialProgress, ProgressDataContext, SettingsContext, SettingsContextType, StudySessionContext, StudySessionContextType, mockMergedSubjectData (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (34): OnboardingData, OnboardingFlowProps, stepTransition, stepVariants, OnboardingLayout(), OnboardingLayoutProps, OnboardingProgress(), OnboardingProgressProps (+26 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Decision Matrix: Convert vs. Keep, 3. Design System Alignment, 4. Implementation Guides & Code Templates, 5. CSS Cleanup Protocol, 6. Accessibility Notes, Easing and Timings, Framer Motion Migration Strategy (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (11): 1. Anatomy, 2. Spacing & Sizing, 3. Colors (by state), 4. Interactive States, 5. Variants, 6. Responsive, 7. Animation (if any), 8. Edge Cases (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (11): scripts, build, dev, format, format:check, lint, package, preview (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.25
Nodes (7): 1. Project Overview, 2. Recent Implementation: Subtopics Tracking & Chapter Workspace (V2), Directory Structure, Key Implementations & Architecture, Project Overview & Context: ojee-tracker, Tech Stack, Use the caveman skill and ponytail skill whenever required without fail.

### Community 27 - "Community 27"
Cohesion: 0.24
Nodes (5): TaskModal(), TaskType, useTaskForm(), TimePicker, TimePickerHandle

### Community 28 - "Community 28"
Cohesion: 0.06
Nodes (34): Advanced: Blind comparison, Anatomy of a Skill, Capture Intent, Claude.ai-specific instructions, Communicating with the user, Cowork-Specific Instructions, Creating a skill, Description Optimization (+26 more)

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
Cohesion: 0.06
Nodes (34): Advanced: Blind comparison, Anatomy of a Skill, Capture Intent, Claude.ai-specific instructions, Communicating with the user, Cowork-Specific Instructions, Creating a skill, Description Optimization (+26 more)

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): FINAL OUTPUT, GUIDELINES FOR THIS PROMPT, PHASE 1 — COMPONENT AUDIT, PHASE 2 — DIAGNOSIS, PHASE 3 — OVERHAUL PLAN

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (5): [0.0.20] - 2026-02-26 20:30, AI Maintenance Run, Architectural Changes, Feature-Level Changes, Suggested ADR Entries

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (5): 0.0.7 (2026-01-19), Added, Changed, Fixed, Removed

### Community 45 - "Community 45"
Cohesion: 0.07
Nodes (27): Analyzing Benchmark Results, Categories for Suggestions, Guidelines, Guidelines, Inputs, Inputs, Output Format, Post-hoc Analyzer Agent (+19 more)

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 48 - "Community 48"
Cohesion: 0.07
Nodes (27): Analyzing Benchmark Results, Categories for Suggestions, Guidelines, Guidelines, Inputs, Inputs, Output Format, Post-hoc Analyzer Agent (+19 more)

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
Cohesion: 0.15
Nodes (20): CalendarGrid(), CalendarGridProps, WEEKDAY_HEADERS, DayColumnProps, DayModal(), DayModalProps, formatStudyTime(), DayTile (+12 more)

### Community 67 - "Community 67"
Cohesion: 0.15
Nodes (19): build_run(), embed_file(), find_runs(), _find_runs_recursive(), generate_html(), get_mime_type(), _kill_port(), load_previous_iteration() (+11 more)

### Community 68 - "Community 68"
Cohesion: 0.19
Nodes (15): DashboardProps, PlannerProps, SessionHistoryProps, formatDuration(), SessionStatistics(), SessionStatisticsProps, StudyClockProps, subjectConfig (+7 more)

### Community 69 - "Community 69"
Cohesion: 0.33
Nodes (3): ImportSyncPageProps, OjeetSyncPayload, VALID_SUBJECTS

### Community 70 - "Community 70"
Cohesion: 0.39
Nodes (4): Planner(), ViewMode, useDateNavigator(), usePlannerData()

### Community 71 - "Community 71"
Cohesion: 0.16
Nodes (18): build_run(), embed_file(), find_runs(), _find_runs_recursive(), generate_html(), get_mime_type(), _kill_port(), load_previous_iteration() (+10 more)

### Community 72 - "Community 72"
Cohesion: 0.22
Nodes (7): InviteHandler(), generateColorsFromAccent(), UserAvatar(), UserAvatarProps, ColorPickerModal(), ColorPickerModalProps, hslToHex()

### Community 73 - "Community 73"
Cohesion: 0.21
Nodes (9): DEFAULT_PLAYLIST, DEFAULT_TRACKS, MusicPlayerDrawer(), Playlist, Track, deleteAudioFile(), getAudioFile(), getDB() (+1 more)

### Community 74 - "Community 74"
Cohesion: 0.10
Nodes (17): CommunityTab, DisconnectModal(), DisconnectModalProps, InviteFriendModal(), InviteFriendModalProps, SkeletonFriendCard(), SkeletonFriendCardProps, AMOUNTS (+9 more)

### Community 75 - "Community 75"
Cohesion: 0.12
Nodes (16): Field Descriptions, Grader Agent, Grading Criteria, Guidelines, Inputs, Output Format, Process, Role (+8 more)

### Community 76 - "Community 76"
Cohesion: 0.14
Nodes (13): CommunityPage(), RemoteAuthContext, RemoteAuthContextType, RemoteAuthProvider(), useRemoteAuth(), FriendProfile, useFriends(), DAY_LABELS (+5 more)

### Community 77 - "Community 77"
Cohesion: 0.43
Nodes (6): DailyAnalytics(), formatDateDisplay(), formatHourLabel(), formatSmartDuration(), formatStatValue(), getLocalDateString()

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (11): EXAM_OPTIONS, GRADE_OPTIONS, ProfileEditModal(), ProfileEditModalProps, DAY_LABELS, formatLastSeen(), formatSmartDuration(), UserProfileCard (+3 more)

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (9): ProgressDataContextType, UserProgressContextType, EncodedPayloadChunked, EncodedPayloadInline, SyncPayloadInput, SyncPayloadV1, AppProgress, ExamEntry (+1 more)

### Community 84 - "Community 84"
Cohesion: 0.12
Nodes (16): Field Descriptions, Grader Agent, Grading Criteria, Guidelines, Inputs, Output Format, Process, Role (+8 more)

### Community 85 - "Community 85"
Cohesion: 0.13
Nodes (14): Blind Comparator Agent, Field Descriptions, Guidelines, Inputs, Output Format, Process, Role, Step 1: Read Both Outputs (+6 more)

### Community 86 - "Community 86"
Cohesion: 0.13
Nodes (14): Blind Comparator Agent, Field Descriptions, Guidelines, Inputs, Output Format, Process, Role, Step 1: Read Both Outputs (+6 more)

### Community 87 - "Community 87"
Cohesion: 0.20
Nodes (9): analysis.json, benchmark.json, comparison.json, evals.json, grading.json, history.json, JSON Schemas, metrics.json (+1 more)

### Community 88 - "Community 88"
Cohesion: 0.20
Nodes (9): analysis.json, benchmark.json, comparison.json, evals.json, grading.json, history.json, JSON Schemas, metrics.json (+1 more)

### Community 89 - "Community 89"
Cohesion: 0.24
Nodes (10): CoPilotRecommendation, ACCENT_COLORS, HeaderProps, MockScore, ProgressCardSettings, DEFAULT_VISIBLE_STATS, ProgressCardModal(), ProgressCardModalProps (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.07
Nodes (28): CloudSyncPromptModal(), CloudSyncPromptModalProps, ConfirmationModal(), ConfirmationModalProps, GoogleSignInButton(), GoogleSignInButtonProps, PwaUpdateBanner(), SettingsModal() (+20 more)

### Community 91 - "Community 91"
Cohesion: 0.11
Nodes (25): CoPilotNudgeRow(), CoPilotNudgeRowProps, ManageMockPresetsModal(), ManageMockPresetsModalProps, ReportsPage(), RemoteSyncProvider(), SubjectDataContext, SubjectDataProvider() (+17 more)

### Community 92 - "Community 92"
Cohesion: 0.50
Nodes (4): 0.0.8 (2026-01-31), Added, Changed, Fixed

### Community 96 - "Community 96"
Cohesion: 0.17
Nodes (10): caveman, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Intensity (+2 more)

### Community 98 - "Community 98"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 102 - "Community 102"
Cohesion: 0.67
Nodes (3): [0.0.15](https://github.com/Namankatiyar/pcm-tracker/compare/v0.0.14...v0.0.15) (2026-02-03), Bug Fixes, Features

## Knowledge Gaps
- **726 isolated node(s):** `config`, `name`, `version`, `type`, `bin` (+721 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StudySession` connect `Community 52` to `Community 3`, `Community 68`, `Community 4`, `Community 70`, `Community 7`, `Community 6`, `Community 69`, `Community 5`, `Community 76`, `Community 77`, `Community 78`, `Community 80`, `Community 21`, `Community 89`, `Community 91`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `useUserProgress()` connect `Community 91` to `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 74`, `Community 76`, `Community 77`, `Community 78`, `Community 19`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Subject` connect `Community 68` to `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 70`, `Community 7`, `Community 27`, `Community 6`, `Community 69`, `Community 76`, `Community 77`, `Community 80`, `Community 19`, `Community 21`, `Community 89`, `Community 91`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `Recursively find directories that contain an outputs/ subdirectory.`, `Build a run dict with prompt, outputs, and grading data.`, `Read a file and return an embedded representation.` to the rest of the system?**
  _740 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11695906432748537 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09758454106280193 - nodes in this community are weakly interconnected._