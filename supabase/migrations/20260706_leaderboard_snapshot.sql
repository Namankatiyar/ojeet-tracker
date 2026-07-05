-- =============================================================================
-- Migration: 20260706_leaderboard_snapshot.sql
-- Pre-computed leaderboard snapshot refreshed nightly at midnight IST via pg_cron.
-- Replaces client-side profiles query with a single read of ~10 denormalized rows.
-- =============================================================================

BEGIN;

-- 1. Create the snapshot table
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshot (
  rank          SMALLINT NOT NULL,
  user_id       UUID NOT NULL,
  display_name  TEXT,
  username      TEXT,
  avatar_url    TEXT,
  weekly_hours  NUMERIC NOT NULL DEFAULT 0,
  snapshot_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (rank)
);

-- 2. RLS: read-only for authenticated users
ALTER TABLE public.leaderboard_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leaderboard_snapshot_select" ON public.leaderboard_snapshot;
CREATE POLICY "leaderboard_snapshot_select" ON public.leaderboard_snapshot
  FOR SELECT
  TO authenticated
  USING (true);

-- Block anon and all writes from client
REVOKE ALL ON public.leaderboard_snapshot FROM anon;
GRANT SELECT ON public.leaderboard_snapshot TO authenticated;

-- 3. Refresh function — SECURITY DEFINER bypasses RLS for the truncate+insert
CREATE OR REPLACE FUNCTION public.refresh_leaderboard_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  TRUNCATE public.leaderboard_snapshot;

  INSERT INTO public.leaderboard_snapshot (rank, user_id, display_name, username, avatar_url, weekly_hours, snapshot_at)
  SELECT
    ROW_NUMBER() OVER (ORDER BY p.weekly_hours DESC NULLS LAST)::SMALLINT AS rank,
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    COALESCE(p.weekly_hours, 0),
    now()
  FROM public.profiles p
  WHERE p.leaderboard_invalidated = false
    AND COALESCE(p.weekly_hours, 0) > 0
  ORDER BY p.weekly_hours DESC NULLS LAST
  LIMIT 10;
END;
$$;

-- 4. Schedule nightly at 18:30 UTC = 00:00 IST
SELECT cron.schedule(
  'refresh-leaderboard-snapshot',
  '30 18 * * *',
  'SELECT public.refresh_leaderboard_snapshot()'
);

-- 5. Seed with initial data so leaderboard is not empty until first cron run
SELECT public.refresh_leaderboard_snapshot();

COMMIT;
