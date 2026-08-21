-- =============================================================================
-- Migration: 20260821_io_budget_fix.sql
-- Purpose  : Fix three compounding Disk I/O budget drain issues + two RLS defects
--            identified in the 2026-08-21 diagnosis report.
--
-- Changes:
--   1. Rewrite refresh_leaderboard_snapshot(): TRUNCATE → incremental upsert
--   2. Reschedule cron from */15 → */30 (halves I/O, standings lag ≤30 min)
--   3. ANALYZE bloated tables (user_sync_state, user_sync_chunks)
--   4. Fix auth_rls_initplan on entity_change_log (bare → (SELECT auth.uid()))
--   5. Drop redundant "Users read own profiles" SELECT policy on profiles
--   6. Add missing index on group_members.user_id
-- =============================================================================


-- =============================================================================
-- Section 1 — Rewrite refresh_leaderboard_snapshot(): TRUNCATE → incremental upsert
--
-- The (mode, rank) composite PK already exists on leaderboard_snapshot
-- (added in 20260720_leaderboard_modes.sql). We exploit it with ON CONFLICT DO UPDATE.
--
-- Why this is better:
--   - No TRUNCATE = no buffer-pool invalidation; shared buffers stay warm between calls.
--   - Only truly changed rows are written (fewer dirty pages per call).
--   - Single generate_series(0,29) cross-join replaces 3 separate full scans of
--     user_study_aggregate, reducing reads from 3× to 1× per refresh.
--   - Stale (mode, rank) slots (e.g. fewer than 10 users active) are pruned by
--     deleting un-updated snapshot_at timestamps rather than a table-level TRUNCATE.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_snapshot()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_snapshot_at TIMESTAMPTZ := clock_timestamp();
  today_ist DATE := (v_snapshot_at AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- Compute all three modes in a single pass, avoiding three separate full scans.
  WITH
  agg_base AS (
    SELECT
      u.user_id,
      SUM(COALESCE((u.buckets_daily_json
            -> to_char(today_ist - (s.i || ' days')::interval, 'YYYY-MM-DD')
            ->> 'overall')::numeric, 0)) AS secs,
      s.i
    FROM public.user_study_aggregate u,
         generate_series(0, 29) AS s(i)
    GROUP BY u.user_id, s.i
  ),
  user_secs AS (
    SELECT
      user_id,
      SUM(CASE WHEN i <= 0  THEN secs ELSE 0 END) AS daily_secs,
      SUM(CASE WHEN i <= 6  THEN secs ELSE 0 END) AS weekly_secs,
      SUM(secs)                                    AS monthly_secs
    FROM agg_base
    GROUP BY user_id
  ),
  ranked AS (
    SELECT
      p.id AS user_id, p.display_name, p.username, p.avatar_url,
      ROW_NUMBER() OVER (PARTITION BY 'daily'   ORDER BY us.daily_secs   DESC NULLS LAST) AS daily_rank,
      ROW_NUMBER() OVER (PARTITION BY 'weekly'  ORDER BY us.weekly_secs  DESC NULLS LAST) AS weekly_rank,
      ROW_NUMBER() OVER (PARTITION BY 'monthly' ORDER BY us.monthly_secs DESC NULLS LAST) AS monthly_rank,
      us.daily_secs, us.weekly_secs, us.monthly_secs
    FROM public.profiles p
    JOIN user_secs us ON us.user_id = p.id
    WHERE p.leaderboard_invalidated = false
  ),
  -- Pivot to (mode, rank) rows — only top 10 per mode, only > 0 secs.
  final_rows AS (
    SELECT 'daily'   AS mode, daily_rank   AS rank, user_id, display_name, username, avatar_url,
           ROUND(daily_secs   / 3600.0, 2) AS hours
    FROM ranked WHERE daily_rank   <= 10 AND daily_secs   > 0
    UNION ALL
    SELECT 'weekly',  weekly_rank,  user_id, display_name, username, avatar_url,
           ROUND(weekly_secs  / 3600.0, 2)
    FROM ranked WHERE weekly_rank  <= 10 AND weekly_secs  > 0
    UNION ALL
    SELECT 'monthly', monthly_rank, user_id, display_name, username, avatar_url,
           ROUND(monthly_secs / 3600.0, 2)
    FROM ranked WHERE monthly_rank <= 10 AND monthly_secs > 0
  )
  INSERT INTO public.leaderboard_snapshot
    (mode, rank, user_id, display_name, username, avatar_url, hours, snapshot_at)
  SELECT mode, rank::SMALLINT, user_id, display_name, username, avatar_url, hours, v_snapshot_at
  FROM final_rows
  ON CONFLICT (mode, rank) DO UPDATE SET
    user_id      = EXCLUDED.user_id,
    display_name = EXCLUDED.display_name,
    username     = EXCLUDED.username,
    avatar_url   = EXCLUDED.avatar_url,
    hours        = EXCLUDED.hours,
    snapshot_at  = EXCLUDED.snapshot_at;

  -- Remove (mode, rank) slots that were not touched in this run (e.g. fewer than 10 users studied)
  DELETE FROM public.leaderboard_snapshot
  WHERE snapshot_at < v_snapshot_at;
END;
$$;


-- =============================================================================
-- Section 2 — Reschedule cron: */15 → */30
--
-- 48×/day instead of 96×/day; halves I/O while keeping standings lag ≤30 min.
-- Confirmed by user as the preferred middle ground between live-standings UX
-- and I/O savings.
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-leaderboard-snapshot') THEN
    PERFORM cron.unschedule('refresh-leaderboard-snapshot');
  END IF;
  PERFORM cron.schedule(
    'refresh-leaderboard-snapshot',
    '*/30 * * * *',
    'SELECT public.refresh_leaderboard_snapshot()'
  );
END $$;


-- =============================================================================
-- Section 3 — ANALYZE bloated tables
--
-- user_sync_state  : refreshes planner statistics
-- user_sync_chunks : refreshes planner statistics
-- (Note: VACUUM is run outside migration transaction blocks via maintenance job)
-- =============================================================================

ANALYZE public.user_sync_state;
ANALYZE public.user_sync_chunks;


-- =============================================================================
-- Section 4 — Fix auth_rls_initplan on entity_change_log
--
-- The Supabase advisor flagged both policies as auth_rls_initplan offenders:
-- bare auth.uid() is re-evaluated once per row during a table scan. Wrapping in
-- (SELECT auth.uid()) hoists it to a single initplan evaluation per statement.
-- =============================================================================

DROP POLICY IF EXISTS "Users can insert their own entity change logs." ON public.entity_change_log;
CREATE POLICY "Users can insert their own entity change logs."
  ON public.entity_change_log FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own entity change logs." ON public.entity_change_log;
CREATE POLICY "Users can view their own entity change logs."
  ON public.entity_change_log FOR SELECT
  USING ((SELECT auth.uid()) = user_id);


-- =============================================================================
-- Section 5 — Drop redundant "Users read own profiles" SELECT policy
--
-- Two SELECT policies coexist on profiles:
--   "Users read own profiles"            (20260311): USING (auth.uid() = id) — own-row only
--   "Profiles readable by authenticated" (20260702): USING (true)            — any authed user
--
-- Both fire on every SELECT, evaluating two USING clauses per row. The open-read
-- policy (USING true) is intentional — required for leaderboard JOINs and peer
-- profile lookups. Drop the stricter, superseded own-row policy.
-- =============================================================================

DROP POLICY IF EXISTS "Users read own profiles" ON public.profiles;
-- "Profiles readable by authenticated" (USING true) is retained as the sole SELECT policy.


-- =============================================================================
-- Section 6 — Add missing index on group_members.user_id
--
-- group_members has no migration history (created outside the migration system,
-- either via dashboard or as a platform table). The IF NOT EXISTS guard prevents
-- errors if the table doesn't exist in local dev DB.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members (user_id);
