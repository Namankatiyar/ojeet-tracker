-- =============================================================================
-- Migration: 20260720_leaderboard_modes.sql
-- Adds 'daily', 'weekly', 'monthly' leaderboard modes to the snapshot table.
--
-- Strategy: Use rolling windows computed from buckets_daily_json keys in IST.
--   daily   = last 1 day  (today's YYYY-MM-DD key in IST)
--   weekly  = last 7 days (sum of last 7 daily keys in IST)
--   monthly = last 30 days(sum of last 30 daily keys in IST)
--
-- The old leaderboard_snapshot table (PK: rank) is dropped and recreated with
-- composite PK (mode, rank) and a generic `hours` column. The table holds only
-- ~30 pre-computed rows (3 modes × 10 users) so the drop is completely safe.
-- =============================================================================

BEGIN;

-- 1. Drop old cron job so we can reschedule cleanly
SELECT cron.unschedule('refresh-leaderboard-snapshot');

-- 2. Drop and recreate snapshot table with mode-aware schema
DROP TABLE IF EXISTS public.leaderboard_snapshot;

CREATE TABLE public.leaderboard_snapshot (
  mode          TEXT        NOT NULL CHECK (mode IN ('daily','weekly','monthly')),
  rank          SMALLINT    NOT NULL CHECK (rank >= 1 AND rank <= 10),
  user_id       UUID        NOT NULL,
  display_name  TEXT,
  username      TEXT,
  avatar_url    TEXT,
  hours         NUMERIC     NOT NULL DEFAULT 0,
  snapshot_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (mode, rank)
);

-- 3. RLS: read-only for authenticated users only
ALTER TABLE public.leaderboard_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leaderboard_snapshot_select" ON public.leaderboard_snapshot;
CREATE POLICY "leaderboard_snapshot_select" ON public.leaderboard_snapshot
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON public.leaderboard_snapshot FROM anon;
GRANT SELECT ON public.leaderboard_snapshot TO authenticated;

-- 4. Rewrite refresh function — rolling window via buckets_daily_json IST keys
--    daily   => sum 'overall' seconds for today in IST (day 0)
--    weekly  => sum 'overall' seconds for last 7 days in IST (days 0-6)
--    monthly => sum 'overall' seconds for last 30 days in IST (days 0-29)
CREATE OR REPLACE FUNCTION public.refresh_leaderboard_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_ist   DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- Truncate all 3 modes before repopulating
  TRUNCATE public.leaderboard_snapshot;

  -- ── Daily: rolling 1 day (today in IST) ───────────────────────────────────
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

-- 5. Re-schedule nightly at 18:30 UTC = 00:00 IST
SELECT cron.schedule(
  'refresh-leaderboard-snapshot',
  '30 18 * * *',
  'SELECT public.refresh_leaderboard_snapshot()'
);

-- 6. Seed immediately so leaderboard is populated before next cron run
SELECT public.refresh_leaderboard_snapshot();

COMMIT;
