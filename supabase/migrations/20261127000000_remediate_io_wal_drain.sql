-- =============================================================================
-- Migration: 20261127000000_remediate_io_wal_drain.sql
-- Purpose  : Remediate production IO / WAL drain root causes (RC-1 through RC-7):
--              - RC-1: Split hot vs cold domains on user_sync_state + suppress
--                      redundant updates trigger
--              - RC-2: Increase bounded batch/cadence for cron_prune_revoked_refresh_tokens
--              - RC-3: Suppress redundant updates on user_study_aggregate BEFORE
--                      before_upsert_user_study_aggregate()
--              - RC-4: Restrict refresh_leaderboard_snapshot() to active 30d users
--              - RC-5/RC-7: Drop genuinely redundant/unused indexes while preserving
--                      FK/unique-constraint indexes
--              - RC-6: Suppress redundant updates on peer_visibility_settings &
--                      live_activity, add 'biology' to live_activity_subject_check,
--                      and optimize get_visible_peer_ids() with UNION ALL + partial indexes
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- RC-1: user_sync_state — Split hot/cold payload columns + redundant update guard
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_sync_state
  ADD COLUMN IF NOT EXISTS hot_payload text,
  ADD COLUMN IF NOT EXISTS hot_checksum text,
  ADD COLUMN IF NOT EXISTS cold_payload text,
  ADD COLUMN IF NOT EXISTS cold_checksum text,
  ADD COLUMN IF NOT EXISTS payload_format text NOT NULL DEFAULT 'legacy_v1'::text;

ALTER TABLE public.user_sync_state
  DROP CONSTRAINT IF EXISTS user_sync_state_hot_max_512kb;
ALTER TABLE public.user_sync_state
  ADD CONSTRAINT user_sync_state_hot_max_512kb
  CHECK (hot_payload IS NULL OR octet_length(hot_payload) <= 524288);

ALTER TABLE public.user_sync_state
  DROP CONSTRAINT IF EXISTS user_sync_state_cold_max_512kb;
ALTER TABLE public.user_sync_state
  ADD CONSTRAINT user_sync_state_cold_max_512kb
  CHECK (cold_payload IS NULL OR octet_length(cold_payload) <= 524288);

ALTER TABLE public.user_sync_state
  DROP CONSTRAINT IF EXISTS user_sync_state_payload_format_check;
ALTER TABLE public.user_sync_state
  ADD CONSTRAINT user_sync_state_payload_format_check
  CHECK (payload_format = ANY (ARRAY['legacy_v1'::text, 'split_v2'::text]));

DROP TRIGGER IF EXISTS trg_user_sync_state_updated_at ON public.user_sync_state;
CREATE TRIGGER trg_user_sync_state_updated_at
  BEFORE UPDATE ON public.user_sync_state
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS zz_user_sync_state_suppress_redundant_updates ON public.user_sync_state;
CREATE TRIGGER zz_user_sync_state_suppress_redundant_updates
  BEFORE UPDATE ON public.user_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION suppress_redundant_updates_trigger();

-- -----------------------------------------------------------------------------
-- RC-2: auth.refresh_tokens — Higher safe bounded batch & 4x/day schedule
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cron_prune_revoked_refresh_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
BEGIN
  -- Keep 14 days of revoked tokens for GoTrue token-reuse security detection.
  -- Prune in bounded 5,000-row batches (4x/day = up to 20,000/day) to clear
  -- backlog without long locks or WAL/IO spikes.
  DELETE FROM auth.refresh_tokens
  WHERE id IN (
    SELECT id FROM auth.refresh_tokens
    WHERE revoked = true
      AND updated_at < (now() - interval '14 days')
    ORDER BY id
    LIMIT 5000
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cron_prune_revoked_refresh_tokens() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-revoked-refresh-tokens') THEN
    PERFORM cron.unschedule('prune-revoked-refresh-tokens');
  END IF;
  PERFORM cron.schedule('prune-revoked-refresh-tokens', '50 2,8,14,20 * * *', 'SELECT public.cron_prune_revoked_refresh_tokens()');
END $$;

-- -----------------------------------------------------------------------------
-- RC-3: user_study_aggregate — Suppress redundant updates BEFORE upsert trigger
-- -----------------------------------------------------------------------------
-- Alphabetical order: aa_user_study_aggregate_suppress_redundant_updates fires
-- before trg_user_study_aggregate_before_update so unchanged upserts abort
-- before updated_at is bumped or prune_video_watch_entries() runs.
DROP TRIGGER IF EXISTS trg_user_study_aggregate_before_upsert ON public.user_study_aggregate;
DROP TRIGGER IF EXISTS trg_user_study_aggregate_before_insert ON public.user_study_aggregate;
DROP TRIGGER IF EXISTS trg_user_study_aggregate_before_update ON public.user_study_aggregate;
DROP TRIGGER IF EXISTS aa_user_study_aggregate_suppress_redundant_updates ON public.user_study_aggregate;

CREATE TRIGGER aa_user_study_aggregate_suppress_redundant_updates
  BEFORE UPDATE ON public.user_study_aggregate
  FOR EACH ROW
  EXECUTE FUNCTION suppress_redundant_updates_trigger();

CREATE TRIGGER trg_user_study_aggregate_before_insert
  BEFORE INSERT ON public.user_study_aggregate
  FOR EACH ROW
  EXECUTE FUNCTION public.before_upsert_user_study_aggregate();

CREATE TRIGGER trg_user_study_aggregate_before_update
  BEFORE UPDATE ON public.user_study_aggregate
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.before_upsert_user_study_aggregate();

-- -----------------------------------------------------------------------------
-- RC-4: refresh_leaderboard_snapshot() — Index-backed 30-day active user filter
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_study_aggregate_updated_at
  ON public.user_study_aggregate USING btree (updated_at DESC);

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_snapshot_at TIMESTAMPTZ := clock_timestamp();
  today_ist DATE := (v_snapshot_at AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  WITH
  date_keys AS (
    SELECT
      s.i,
      to_char(today_ist - s.i, 'YYYY-MM-DD') AS day_key
    FROM generate_series(0, 29) AS s(i)
  ),
  active_users AS (
    SELECT
      u.user_id,
      u.buckets_daily_json,
      p.display_name,
      p.username,
      p.avatar_url
    FROM public.user_study_aggregate u
    JOIN public.profiles p ON p.id = u.user_id
    WHERE u.updated_at >= (v_snapshot_at - interval '31 days')
      AND p.leaderboard_invalidated = false
  ),
  user_secs AS (
    SELECT
      au.user_id,
      au.display_name,
      au.username,
      au.avatar_url,
      SUM(CASE WHEN dk.i = 0 THEN COALESCE((au.buckets_daily_json -> dk.day_key ->> 'overall')::numeric, 0) ELSE 0 END) AS daily_secs,
      SUM(CASE WHEN dk.i <= 6 THEN COALESCE((au.buckets_daily_json -> dk.day_key ->> 'overall')::numeric, 0) ELSE 0 END) AS weekly_secs,
      SUM(COALESCE((au.buckets_daily_json -> dk.day_key ->> 'overall')::numeric, 0)) AS monthly_secs
    FROM active_users au
    CROSS JOIN date_keys dk
    GROUP BY au.user_id, au.display_name, au.username, au.avatar_url
  ),
  ranked AS (
    SELECT
      user_id, display_name, username, avatar_url,
      ROW_NUMBER() OVER (ORDER BY daily_secs   DESC NULLS LAST) AS daily_rank,
      ROW_NUMBER() OVER (ORDER BY weekly_secs  DESC NULLS LAST) AS weekly_rank,
      ROW_NUMBER() OVER (ORDER BY monthly_secs DESC NULLS LAST) AS monthly_rank,
      daily_secs, weekly_secs, monthly_secs
    FROM user_secs
  ),
  final_rows AS (
    SELECT 'daily'::text   AS mode, daily_rank::smallint   AS rank, user_id, display_name, username, avatar_url,
           ROUND(daily_secs   / 3600.0, 2) AS hours
    FROM ranked WHERE daily_rank   <= 10 AND daily_secs   > 0
    UNION ALL
    SELECT 'weekly'::text  AS mode, weekly_rank::smallint  AS rank, user_id, display_name, username, avatar_url,
           ROUND(weekly_secs  / 3600.0, 2) AS hours
    FROM ranked WHERE weekly_rank  <= 10 AND weekly_secs  > 0
    UNION ALL
    SELECT 'monthly'::text AS mode, monthly_rank::smallint AS rank, user_id, display_name, username, avatar_url,
           ROUND(monthly_secs / 3600.0, 2) AS hours
    FROM ranked WHERE monthly_rank <= 10 AND monthly_secs > 0
  ),
  pruned AS (
    DELETE FROM public.leaderboard_snapshot ls
    WHERE NOT EXISTS (
      SELECT 1 FROM final_rows f
      WHERE f.mode = ls.mode AND f.rank = ls.rank
    )
  )
  INSERT INTO public.leaderboard_snapshot
    (mode, rank, user_id, display_name, username, avatar_url, hours, snapshot_at)
  SELECT mode, rank, user_id, display_name, username, avatar_url, hours, v_snapshot_at
  FROM final_rows
  ON CONFLICT (mode, rank) DO UPDATE SET
    user_id      = EXCLUDED.user_id,
    display_name = EXCLUDED.display_name,
    username     = EXCLUDED.username,
    avatar_url   = EXCLUDED.avatar_url,
    hours        = EXCLUDED.hours,
    snapshot_at  = EXCLUDED.snapshot_at
  WHERE (
    leaderboard_snapshot.user_id,
    leaderboard_snapshot.display_name,
    leaderboard_snapshot.username,
    leaderboard_snapshot.avatar_url,
    leaderboard_snapshot.hours
  ) IS DISTINCT FROM (
    EXCLUDED.user_id,
    EXCLUDED.display_name,
    EXCLUDED.username,
    EXCLUDED.avatar_url,
    EXCLUDED.hours
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- RC-5 & RC-7: Drop truly redundant/unused secondary indexes
-- -----------------------------------------------------------------------------
-- Kept intentionally:
--   - profiles_username_key (enforces UNIQUE (username) constraint)
--   - idx_group_members_user_id (get_my_groups() + group_members_user_id_fkey)
--   - idx_groups_created_by (groups_created_by_fkey ON DELETE CASCADE)
--   - idx_peer_relationships_user_id_2 (pending lookups + user_id_2 FK cascade)
--   - All 4 study_session_log indexes (pkey, unique_user_session, created_at
--     for cron_prune_stale_session_logs, (user_id, created_at) for delta sync)
DROP INDEX IF EXISTS public.idx_user_sync_chunks_user_version;
DROP INDEX IF EXISTS public.idx_peer_relationships_status;
DROP INDEX IF EXISTS public.idx_entity_change_log_user_domain_time;
DROP INDEX IF EXISTS public.idx_entity_change_log_user_client;
DROP INDEX IF EXISTS public.idx_entity_change_log_created_at;

-- -----------------------------------------------------------------------------
-- RC-6: peer_visibility_settings, live_activity, get_visible_peer_ids()
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_peer_visibility_settings_updated_at ON public.peer_visibility_settings;
CREATE TRIGGER trg_peer_visibility_settings_updated_at
  BEFORE UPDATE ON public.peer_visibility_settings
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS zz_peer_visibility_settings_suppress_redundant_updates ON public.peer_visibility_settings;
CREATE TRIGGER zz_peer_visibility_settings_suppress_redundant_updates
  BEFORE UPDATE ON public.peer_visibility_settings
  FOR EACH ROW
  EXECUTE FUNCTION suppress_redundant_updates_trigger();

DROP TRIGGER IF EXISTS trg_live_activity_updated_at ON public.live_activity;
CREATE TRIGGER trg_live_activity_updated_at
  BEFORE UPDATE ON public.live_activity
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS zz_live_activity_suppress_redundant_updates ON public.live_activity;
CREATE TRIGGER zz_live_activity_suppress_redundant_updates
  BEFORE UPDATE ON public.live_activity
  FOR EACH ROW
  EXECUTE FUNCTION suppress_redundant_updates_trigger();

ALTER TABLE public.live_activity
  DROP CONSTRAINT IF EXISTS live_activity_subject_check;
ALTER TABLE public.live_activity
  ADD CONSTRAINT live_activity_subject_check
  CHECK (subject = ANY (ARRAY['physics'::text, 'chemistry'::text, 'maths'::text, 'biology'::text]));

CREATE INDEX IF NOT EXISTS idx_peer_relationships_accepted_u1
  ON public.peer_relationships USING btree (user_id_1, user_id_2)
  WHERE status = 'accepted'::text;

CREATE INDEX IF NOT EXISTS idx_peer_relationships_accepted_u2
  ON public.peer_relationships USING btree (user_id_2, user_id_1)
  WHERE status = 'accepted'::text;

CREATE OR REPLACE FUNCTION public.get_visible_peer_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH accepted_peers AS (
    SELECT pr.user_id_2 AS peer_id
    FROM public.peer_relationships pr
    WHERE pr.user_id_1 = p_user_id
      AND pr.status = 'accepted'
    UNION ALL
    SELECT pr.user_id_1 AS peer_id
    FROM public.peer_relationships pr
    WHERE pr.user_id_2 = p_user_id
      AND pr.status = 'accepted'
  )
  SELECT ap.peer_id
  FROM accepted_peers ap
  LEFT JOIN public.peer_visibility_settings pvs
    ON pvs.user_id = ap.peer_id
  WHERE pvs.show_agenda IS NOT FALSE;
$function$;

COMMIT;
