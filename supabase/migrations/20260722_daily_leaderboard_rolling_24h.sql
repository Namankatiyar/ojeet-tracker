-- =============================================================================
-- Migration: 20260722_daily_leaderboard_rolling_24h.sql
-- Fix: the 'daily' leaderboard mode was almost always empty.
--
-- refresh_leaderboard_snapshot() runs once nightly at 00:00 IST (18:30 UTC).
-- The daily block summed only day 0 (today's IST bucket), which is near-empty
-- at the moment the cron fires, so 'daily' standings were blank all day.
--
-- Fix: widen daily to a rolling 24h window = last 2 IST day-buckets
-- (generate_series(0, 1)) so it is never empty right after midnight. Weekly
-- (0-6) and monthly (0-29) blocks are unchanged. Function keeps its pinned
-- search_path. The frontend copy already reads "last 24 hours".
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

  -- ── Daily: rolling 24h (last 2 IST day-buckets, days 0-1) ──────────────────
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
         generate_series(0, 1) AS s(i)
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

-- Reseed immediately so daily standings populate without waiting for the cron.
SELECT public.refresh_leaderboard_snapshot();

COMMIT;

