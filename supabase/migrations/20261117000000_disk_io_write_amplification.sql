-- =============================================================================
-- Migration: Disk I/O write amplification fixes
-- =============================================================================
-- 1. Drop idx_user_study_aggregate_updated_at (20260702_perf_audit_fixes.sql).
--    Nothing filters/orders by user_study_aggregate.updated_at (verified by repo
--    grep of src/, api/, supabase/). The BEFORE trigger rewrites updated_at on
--    every write, so this index also blocked HOT updates: every aggregate
--    update had to write a new index entry (+ WAL) for no read benefit.
--
-- 2. Drop idx_user_sync_chunks_created_at (20260725000000_r1_...sql).
--    Chunk pruning uses (user_id, payload_version) -> idx_user_sync_chunks_lookup;
--    created_at is never queried (the 45-day prunes target study_session_log
--    and entity_change_log, not user_sync_chunks).
--
-- 3. public.profiles: stop no-op row rewrites.
--    BEFORE UPDATE triggers on profiles, in firing (alphabetical) order:
--      a) trg_profiles_leaderboard_guardrail  (sets leaderboard_invalidated;
--                                              deterministic, so it is a no-op
--                                              for unchanged rows)
--      b) trg_profiles_updated_at             (now: WHEN row actually changed)
--      c) zz_profiles_suppress_redundant_updates (built-in; returns NULL when
--                                              NEW is binary-identical to OLD)
--    Postgres fires BEFORE ROW triggers in name order, and a trigger's WHEN
--    condition is evaluated immediately before that trigger would fire, seeing
--    NEW as modified by earlier triggers. So (b) sees the guardrail's result,
--    leaves updated_at alone for identical updates, and (c), firing last, sees
--    NEW == OLD and cancels the update: no new tuple, no index entries, no WAL.
--    Real changes still bump updated_at (friends' clients refetch on that).
--    ensure_invite_code is BEFORE INSERT only and does not interact.
--    Note: a suppressed UPDATE affects 0 rows, so callers must not treat
--    "0 rows returned" from an UPDATE as "row missing".
--
-- Intentionally NOT changed: user_sync_state's updated_at trigger (clients
-- always push a new client_updated_at, so suppression would rarely help) and
-- user_study_aggregate's before_upsert trigger.
-- VACUUM is deliberately not included (cannot run inside a transaction).
-- =============================================================================

BEGIN;

-- Fail fast instead of queueing hot-table traffic behind a blocked DDL lock.
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1 & 2. Drop write-only indexes
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_user_study_aggregate_updated_at;
DROP INDEX IF EXISTS public.idx_user_sync_chunks_created_at;

-- ---------------------------------------------------------------------------
-- 3. profiles: conditional updated_at + redundant-update suppression
-- ---------------------------------------------------------------------------
-- Safety guard: `OLD.* IS DISTINCT FROM NEW.*` needs an equality operator for
-- every column type. Plain `json` and `xml` have none and would make every
-- profiles UPDATE error out at runtime, so abort the migration instead.
DO $$
DECLARE
  bad_cols text;
BEGIN
  SELECT string_agg(a.attname || ' (' || format_type(a.atttypid, a.atttypmod) || ')', ', ')
    INTO bad_cols
  FROM pg_attribute a
  WHERE a.attrelid = 'public.profiles'::regclass
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND a.atttypid IN ('json'::regtype, 'xml'::regtype);

  IF bad_cols IS NOT NULL THEN
    RAISE EXCEPTION
      'public.profiles has columns without an equality operator: %. Convert to jsonb or adjust this migration.',
      bad_cols;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.set_updated_at();

-- "zz_" prefix guarantees this fires after every other BEFORE UPDATE trigger.
DROP TRIGGER IF EXISTS zz_profiles_suppress_redundant_updates ON public.profiles;
CREATE TRIGGER zz_profiles_suppress_redundant_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION suppress_redundant_updates_trigger();

COMMIT;
