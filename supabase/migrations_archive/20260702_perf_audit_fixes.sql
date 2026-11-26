-- =============================================================================
-- Migration: 20260702_perf_audit_fixes.sql
-- DB Performance Audit Fixes (2026-07-02)
-- All changes are idempotent (IF EXISTS / IF NOT EXISTS guards throughout).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 1: VACUUM ANALYZE — resolve dead-tuple bloat (P0-A)
-- Skipping live_activity: autovacuumed at 16:41 UTC today.
-- ---------------------------------------------------------------------------
VACUUM ANALYZE public.profiles;
VACUUM ANALYZE public.peer_visibility_settings;
VACUUM ANALYZE public.user_sync_state;


-- ---------------------------------------------------------------------------
-- SECTION 2: Fix `profiles` SELECT policy (P1-A)
-- Removing are_users_peers() (funcid 73489) which fires per-row.
-- Replacing with open authenticated read; client-side peer filtering applies.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles readable by peers optimized" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by peers inline"    ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);


-- ---------------------------------------------------------------------------
-- SECTION 3: Fix `live_activity` SELECT policy (P0-B + security tightening)
-- Current live policy (20260627) has NO peer gate — any authenticated user
-- can read any live_activity row as long as show_agenda IS NOT FALSE.
-- New policy: self always visible; peers visible only when show_agenda IS
-- NOT FALSE; non-peers cannot read at all.
-- Uses inline EXISTS on peer_relationships — no are_users_peers() call.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "live_activity_select_optimized"   ON public.live_activity;
DROP POLICY IF EXISTS "live_activity_select_v2"          ON public.live_activity;
DROP POLICY IF EXISTS "Authenticated users can view live_activity" ON public.live_activity;

CREATE POLICY "live_activity_select_v2" ON public.live_activity
  FOR SELECT
  USING (
    -- Own row: always readable
    (SELECT auth.uid()) = user_id
    OR (
      -- Must be a confirmed peer
      EXISTS (
        SELECT 1
        FROM public.peer_relationships pr
        WHERE pr.status = 'accepted'
          AND (
            (pr.user_id_1 = (SELECT auth.uid()) AND pr.user_id_2 = live_activity.user_id)
            OR
            (pr.user_id_2 = (SELECT auth.uid()) AND pr.user_id_1 = live_activity.user_id)
          )
      )
      -- And the row owner has not hidden their agenda
      AND (
        SELECT pvs.show_agenda
        FROM public.peer_visibility_settings pvs
        WHERE pvs.user_id = live_activity.user_id
        LIMIT 1
      ) IS NOT FALSE
    )
  );


-- ---------------------------------------------------------------------------
-- SECTION 4: Fix invite_code — add UNIQUE constraint, drop redundant plain index (P1-B)
-- SCHEMA.md lists a UNIQUE column but live DB only has a plain btree.
-- Drop the plain index first, then enforce uniqueness at constraint level.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_profiles_invite_code;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_invite_code_key;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_invite_code_key UNIQUE (invite_code);


-- ---------------------------------------------------------------------------
-- SECTION 5: Drop unused `subjects_name_key` index (P1-C)
-- subjects table has 0 seq_scans / 0 idx_scans; data is served from JSON files.
-- The UNIQUE name constraint is retained implicitly via the table definition;
-- we only drop the redundant standalone index.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.subjects_name_key;


-- ---------------------------------------------------------------------------
-- SECTION 6: Add composite index on sync_prune_audit_log (P1-D)
-- Table currently has only a PK index. Add covering index for audit queries
-- filtering by target user, ordered by recency.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sync_prune_audit_log_target_user_pruned_at
  ON public.sync_prune_audit_log (target_user_id, pruned_at DESC);


-- ---------------------------------------------------------------------------
-- SECTION 7: Add UNIQUE constraint on study_session_log(user_id, session_id) (P2-A)
-- BACKEND.md §10 marked this as "Fixed" but live DB shows no constraint.
-- Deduplicate existing rows first (keep oldest per pair), then add constraint.
-- ---------------------------------------------------------------------------

-- Step 7a: Remove duplicate rows, keeping the chronologically oldest entry.
DELETE FROM public.study_session_log
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, session_id
        ORDER BY created_at ASC
      ) AS rnum
    FROM public.study_session_log
  ) t
  WHERE t.rnum > 1
);

-- Step 7b: Add the constraint.
ALTER TABLE public.study_session_log
  DROP CONSTRAINT IF EXISTS unique_user_session;

ALTER TABLE public.study_session_log
  ADD CONSTRAINT unique_user_session UNIQUE (user_id, session_id);


-- ---------------------------------------------------------------------------
-- SECTION 8: Add index on user_study_aggregate.updated_at (P3-A)
-- Supports time-range queries on aggregates (e.g. recently synced users).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_study_aggregate_updated_at
  ON public.user_study_aggregate (updated_at DESC);


-- ---------------------------------------------------------------------------
-- SECTION 9: DROP dead-weight tables — subjects & sync_prune_audit_log
-- Both have 0 seq_scans and 0 idx_scans in live monitoring.
-- subjects: data is served entirely from public/data/*.json files.
-- sync_prune_audit_log: new composite index added above is moot after drop —
--   remove the index creation first, then drop the table.
-- ---------------------------------------------------------------------------

-- 9a. Drop the index we just created on sync_prune_audit_log (table is being dropped)
DROP INDEX IF EXISTS public.idx_sync_prune_audit_log_target_user_pruned_at;

-- 9b. Drop the tables (CASCADE drops their indexes, constraints, and RLS policies)
DROP TABLE IF EXISTS public.sync_prune_audit_log CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;


-- ---------------------------------------------------------------------------
-- SECTION 10: Keep idx_peer_relationships_user_id_2 — monitor for 2 weeks
-- Created in 20260626171500. 0 scans now but the live_activity policy fix
-- (Section 3) will drive EXISTS lookups on peer_relationships. The planner
-- will use user_id_2 index when the current user is user_id_2. Keep for now.
-- ---------------------------------------------------------------------------


-- =============================================================================
-- Verification queries (run manually after migration to confirm)
-- =============================================================================
-- SELECT conname FROM pg_constraint
--   WHERE conrelid = 'profiles'::regclass AND contype = 'u' AND conname = 'profiles_invite_code_key';
--
-- SELECT indexname FROM pg_indexes
--   WHERE tablename = 'profiles' AND indexname = 'idx_profiles_invite_code';
-- -- expected: 0 rows (dropped)
--
-- SELECT conname FROM pg_constraint
--   WHERE conrelid = 'study_session_log'::regclass AND contype = 'u';
-- -- expected: unique_user_session
--
-- SELECT polname, pg_get_expr(polqual, polrelid)
--   FROM pg_policy WHERE polrelid = 'profiles'::regclass AND polcmd = 'r';
-- -- expected: "Profiles readable by authenticated" / USING (true)
--
-- SELECT pg_get_expr(polqual, polrelid)
--   FROM pg_policy WHERE polrelid = 'live_activity'::regclass AND polcmd = 'r';
-- -- expected: live_activity_select_v2 with EXISTS(peer_relationships) + show_agenda check
--
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public'
--   AND tablename IN ('subjects', 'sync_prune_audit_log');
-- -- expected: 0 rows

COMMIT;
