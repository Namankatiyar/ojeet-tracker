# NEET Mode Implementation Plan

## Objective
Implement NEET mode in the existing app while preserving all existing JEE users/data, including local storage state, PWA-installed clients, and Supabase remote sync.

## Guiding Constraints
- First release must be additive and backward compatible.
- No destructive schema changes in phase 1.
- No hard dependency on users clearing cache or reinstalling the PWA.
- Existing JEE users must continue working without migration friction.

## 1. Data Model Strategy (Backward Compatible)
1. Add `examMode` support with allowed values `jee` and `neet`.
2. Expand subject model to include `biology` without removing `maths` initially.
3. Keep all old field names/paths readable during transition.

### Expected mode mappings
- JEE subjects: `physics`, `chemistry`, `maths`
- NEET subjects: `physics`, `chemistry`, `biology`

## 2. Supabase Schema Plan (Additive Migration)
Create a new migration (post step3) with only additive changes:

1. `public.user_sync_state`
- Add column:
  - `exam_mode text not null default 'jee'`
  - check constraint: `exam_mode in ('jee','neet')`

2. `public.user_study_aggregate`
- Add column:
  - `total_seconds_biology bigint not null default 0`
- Keep existing `total_seconds_maths` for compatibility with older clients.

3. SQL functions / comments / validation logic
- Update any subject-enum assumptions from `physics|chemistry|maths` to include `biology`.
- Keep logic tolerant to both old and new payload shapes.

4. RLS and grants
- No policy model change required unless any policy references subject-specific fields directly.
- Re-run advisors after migration to validate no regression.

## 3. Sync Contract Versioning
Introduce sync payload V2 while keeping V1 support.

1. Version bump
- Add `SYNC_SCHEMA_VERSION = 2`.

2. Payload additions
- Add `examMode` in payload metadata/domains.

3. Reader behavior
- Read V1 and V2.
- If V1 or missing mode => assume `jee`.

4. Writer behavior
- Emit V2 for new clients.
- Preserve compatibility pathways for V1-origin data until migration window ends.

## 4. App Refactor Plan (Mode-Driven)
1. Centralize mode and subject config in one module:
- Subject keys, display names, exam labels, scoring labels.

2. Replace hardcoded subject arrays/usages:
- e.g. `['physics','chemistry','maths']` => from config.

3. Type updates
- Move from rigid subject typing to mode-aware typing where needed.
- Keep runtime guards for persisted old shapes.

4. CSV sources
- Keep `maths.csv` for JEE.
- Add `biology.csv` for NEET.
- Load CSV map by mode-config.

5. Mock score panel
- Replace JEE-specific text and third-subject handling with mode-aware labels.
- Keep data compatibility for previously saved JEE mocks.

## 5. Local Storage Migration (One-Time, Non-Destructive)
Implement startup migration logic:

1. Detect mode and legacy keys.
2. If NEET mode and only legacy maths paths exist, map/seed biology-compatible structures.
3. Keep fallback reads for old keys for at least one release cycle.
4. Add migration marker key in localStorage to avoid repeated remapping.

## 6. Remote Sync Migration Rules
1. Store `exam_mode` alongside sync state row metadata.
2. Server/client merge logic should never discard unknown subject data abruptly.
3. During transition, if both maths and biology are present:
- Respect `examMode` to decide active third subject in UI.
- Preserve non-active subject data for safety until cleanup phase.

## 7. PWA and Release Rollout Sequence
1. Beta deploy only (fixed beta hostname).
2. Test forward update path from installed old PWA => NEET-capable build.
3. Validate:
- Update on reopen works
- Sync read/write works for existing JEE users
- NEET mode data flow is stable

4. Promote to stable only after beta pass.
5. Monitor support incidents and adoption for 2-4 weeks.

## 8. Testing Matrix
### Functional
- JEE mode: unchanged behavior for all subject screens and analytics.
- NEET mode: biology replaces maths across UI + planner + mock scoring.

### Data compatibility
- Old localStorage (JEE-only) works after update.
- Old remote payload (V1) reads successfully.
- New payload (V2) writes and rehydrates correctly.

### Sync and aggregates
- Study aggregate writes include biology for NEET.
- Maths aggregate continues for JEE and legacy records.

### PWA update
- Installed older build updates to latest without hard refresh.
- Recovery action still works for edge cases.

## 9. Observability and Support Window (2-4 Weeks)
Track at least:
- app version
- release channel
- exam mode
- sync schema version
- update failures / recovery button usage

Maintain compatibility code until support incidents stabilize.

## 10. Cleanup Phase (Post-Stability)
Only after stable migration window:
1. Decide whether to deprecate legacy maths-only assumptions in shared contracts.
2. Remove temporary dual-read shims carefully.
3. Optionally add a second migration for stricter constraints after confirming client adoption.

## 11. Non-Negotiable Safety Rules
- Do not drop or rename existing maths columns/keys in the first NEET release.
- Do not ship NEET mode without V1 payload read support.
- Do not gate success on backward (new->old) PWA downgrade behavior.

## 12. Execution Order (Recommended)
1. Additive Supabase migration
2. Sync V2 + compatibility readers
3. Subject/mode config refactor
4. Biology CSV wiring + mock panel mode labels
5. Local storage migration logic
6. Beta rollout + installed-app update tests
7. Stable rollout + 2-4 week monitoring
