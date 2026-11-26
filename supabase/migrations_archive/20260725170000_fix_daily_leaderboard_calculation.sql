-- =============================================================================
-- Migration: 20260725170000_fix_daily_leaderboard_calculation.sql
-- Fix: Daily leaderboard was summing generate_series(0, 1) (today + yesterday),
-- causing daily study hours to accumulate to 32h, 25h, etc.
--
-- Fix:
-- 1. Restrict 'daily' mode in refresh_leaderboard_snapshot() back to
--    generate_series(0, 0) (today's IST calendar day only).
-- 2. Reschedule pg_cron to run refresh_leaderboard_snapshot() every 15 minutes
--    ('*/15 * * * *') so that daily standings update continuously as students
--    study throughout the day, eliminating stale 0-row snapshots at midnight.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_ist   DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  TRUNCATE public.leaderboard_snapshot;

  -- ── Daily: today in IST (generate_series(0,0)) ────────────────────────────
  INSERT INTO public.leaderboard_snapshot
    (mode, rank, user_id, display_name, username, avatar_url, hours, snapshot_at)
  SELECT
    'daily',
    ROW_NUMBER() OVER (ORDER BY rolling_secs DESC NULLS LAST)::SMALLINT,
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    ROUND(agg.rolling_secs / 3600.0, 2),
    now()
  FROM public.profiles p
  JOIN (
    SELECT
      u.user_id,
      COALESCE(
        SUM(
          COALESCE(
            (u.buckets_daily_json
              -> to_char(today_ist - (s.i || ' days')::interval, 'YYYY-MM-DD')
              ->> 'overall')::numeric,
            0
          )
        ), 0
      ) AS rolling_secs
    FROM public.user_study_aggregate u,
         generate_series(0, 0) AS s(i)
    GROUP BY u.user_id
  ) agg ON agg.user_id = p.id
  WHERE p.leaderboard_invalidated = false
    AND agg.rolling_secs > 0
  ORDER BY agg.rolling_secs DESC NULLS LAST
  LIMIT 10;

  -- ── Weekly: rolling 7 days ─────────────────────────────────────────────────
  INSERT INTO public.leaderboard_snapshot
    (mode, rank, user_id, display_name, username, avatar_url, hours, snapshot_at)
  SELECT
    'weekly',
    ROW_NUMBER() OVER (ORDER BY rolling_secs DESC NULLS LAST)::SMALLINT,
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    ROUND(agg.rolling_secs / 3600.0, 2),
    now()
  FROM public.profiles p
  JOIN (
    SELECT
      u.user_id,
      COALESCE(
        SUM(
          COALESCE(
            (u.buckets_daily_json
              -> to_char(today_ist - (s.i || ' days')::interval, 'YYYY-MM-DD')
              ->> 'overall')::numeric,
            0
          )
        ), 0
      ) AS rolling_secs
    FROM public.user_study_aggregate u,
         generate_series(0, 6) AS s(i)
    GROUP BY u.user_id
  ) agg ON agg.user_id = p.id
  WHERE p.leaderboard_invalidated = false
    AND agg.rolling_secs > 0
  ORDER BY agg.rolling_secs DESC NULLS LAST
  LIMIT 10;

  -- ── Monthly: rolling 30 days ───────────────────────────────────────────────
  INSERT INTO public.leaderboard_snapshot
    (mode, rank, user_id, display_name, username, avatar_url, hours, snapshot_at)
  SELECT
    'monthly',
    ROW_NUMBER() OVER (ORDER BY rolling_secs DESC NULLS LAST)::SMALLINT,
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    ROUND(agg.rolling_secs / 3600.0, 2),
    now()
  FROM public.profiles p
  JOIN (
    SELECT
      u.user_id,
      COALESCE(
        SUM(
          COALESCE(
            (u.buckets_daily_json
              -> to_char(today_ist - (s.i || ' days')::interval, 'YYYY-MM-DD')
              ->> 'overall')::numeric,
            0
          )
        ), 0
      ) AS rolling_secs
    FROM public.user_study_aggregate u,
         generate_series(0, 29) AS s(i)
    GROUP BY u.user_id
  ) agg ON agg.user_id = p.id
  WHERE p.leaderboard_invalidated = false
    AND agg.rolling_secs > 0
  ORDER BY agg.rolling_secs DESC NULLS LAST
  LIMIT 10;
END;
$$;

-- Reschedule cron to refresh every 15 minutes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-leaderboard-snapshot') THEN
    PERFORM cron.unschedule('refresh-leaderboard-snapshot');
  END IF;
  PERFORM cron.schedule('refresh-leaderboard-snapshot', '*/15 * * * *', 'SELECT public.refresh_leaderboard_snapshot()');
END $$;

-- Reseed immediately
SELECT public.refresh_leaderboard_snapshot();

COMMIT;
