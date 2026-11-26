-- =============================================================================
-- Migration: 20261126000000_prod_baseline.sql
-- Purpose  : Reconciled production baseline for Supabase project `immvdbsmzfnbsfuhuknh`
--            (OJEET-Tools), captured 2026-11-26 after archiving the 30 out-of-sync
--            historical migrations to `supabase/migrations_archive/`.
--
-- CLI Reconciliation (run once from a machine with Supabase CLI linked):
--   1. Inspect existing remote versions:
--        supabase migration list --linked
--   2. Mark the 20 legacy remote versions as reverted (metadata-only; no DDL runs):
--        supabase migration repair --status reverted 20260306162402 20260306172834 \
--          20260306173330 20260311075441 20260312163749 20260625131129 20260625131206 \
--          20260625134631 20260626061258 20260626171617 20260627125739 20260702165610 \
--          20260705162237 20260719154357 20260719175530 20260724065420 20260725161007 \
--          20260725161052 20260821074127 20260824153236
--   3. Mark this reconciled baseline as applied:
--        supabase migration repair --status applied 20261126000000
--   4. Verify zero drift:
--        supabase migration list --linked
--        supabase db diff --linked
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Composite Types
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'group_summary'
  ) THEN
    CREATE TYPE public.group_summary AS (
      id uuid,
      name text,
      description text,
      invite_code text,
      avatar_seed text,
      avatar_url text,
      banner_preset text,
      banner_url text,
      created_at timestamp with time zone,
      member_count bigint,
      owner_id uuid,
      owner_name text,
      owner_avatar text
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  display_name text,
  avatar_seed text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  username text,
  avatar_url text,
  banner_url text,
  custom_status text,
  invite_code text,
  streak_count integer NOT NULL DEFAULT 0,
  lifetime_hours numeric(10,2) NOT NULL DEFAULT 0.00,
  weekly_hours numeric(10,2) NOT NULL DEFAULT 0.00,
  focus_score integer NOT NULL DEFAULT 0,
  discord_tag text,
  grade_status text,
  target_exam text,
  today_study_seconds integer DEFAULT 0,
  today_questions integer DEFAULT 0,
  momentum_heatmap jsonb DEFAULT '[]'::jsonb,
  todays_tasks jsonb DEFAULT '[]'::jsonb,
  leaderboard_invalidated boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_invite_code_key UNIQUE (invite_code),
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT chk_profiles_avatar_url_no_base64 CHECK (avatar_url IS NULL OR avatar_url !~~* 'data:%'::text),
  CONSTRAINT profiles_custom_status_check CHECK (char_length(custom_status) <= 100),
  CONSTRAINT profiles_focus_score_check CHECK (focus_score >= 0 AND focus_score <= 100),
  CONSTRAINT profiles_invite_code_check CHECK (invite_code ~ '^[A-Z0-9]{4}$'::text)
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  seed_serial integer NOT NULL,
  name text NOT NULL,
  default_order integer NOT NULL,
  CONSTRAINT chapters_pkey PRIMARY KEY (id),
  CONSTRAINT chapters_subject_id_seed_serial_key UNIQUE (subject_id, seed_serial)
);

CREATE TABLE IF NOT EXISTS public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  invite_code text NOT NULL,
  avatar_seed text DEFAULT 'group-default'::text,
  avatar_url text,
  banner_preset text DEFAULT 'physics-glass'::text,
  banner_url text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_invite_code_key UNIQUE (invite_code),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT groups_banner_preset_check CHECK (banner_preset = ANY (ARRAY['physics-glass'::text, 'chemistry-glass'::text, 'maths-glass'::text, 'dark-glass'::text, 'gradient-neon'::text])),
  CONSTRAINT groups_description_check CHECK (char_length(description) <= 250),
  CONSTRAINT groups_invite_code_check CHECK (invite_code ~ '^[A-Z0-9]{4}$'::text),
  CONSTRAINT groups_name_check CHECK (char_length(name) <= 50)
);

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT group_members_role_check CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]))
);

CREATE TABLE IF NOT EXISTS public.peer_relationships (
  user_id_1 uuid NOT NULL,
  user_id_2 uuid NOT NULL,
  status text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT peer_relationships_pkey PRIMARY KEY (user_id_1, user_id_2),
  CONSTRAINT peer_relationships_user_id_1_fkey FOREIGN KEY (user_id_1) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT peer_relationships_user_id_2_fkey FOREIGN KEY (user_id_2) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT chk_user_id_ordering CHECK (user_id_1 < user_id_2),
  CONSTRAINT peer_relationships_status_check CHECK (status = ANY (ARRAY['pending_1_to_2'::text, 'pending_2_to_1'::text, 'accepted'::text, 'blocked_1_by_2'::text, 'blocked_2_by_1'::text, 'blocked_both'::text]))
);

CREATE TABLE IF NOT EXISTS public.peer_visibility_settings (
  user_id uuid NOT NULL,
  show_live_activity boolean NOT NULL DEFAULT true,
  show_weekly_summary boolean NOT NULL DEFAULT true,
  show_badges boolean NOT NULL DEFAULT true,
  show_backlog_snapshot boolean NOT NULL DEFAULT true,
  show_completed_tasks boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  show_agenda boolean DEFAULT true,
  CONSTRAINT peer_visibility_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT peer_visibility_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.live_activity (
  user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  subject text,
  chapter_name text,
  chapter_serial integer,
  material text,
  started_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT live_activity_pkey PRIMARY KEY (user_id),
  CONSTRAINT live_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT live_activity_subject_check CHECK (subject = ANY (ARRAY['physics'::text, 'chemistry'::text, 'maths'::text]))
);

CREATE TABLE IF NOT EXISTS public.user_data_blobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  compressed_state text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_data_blobs_pkey PRIMARY KEY (id),
  CONSTRAINT user_data_blobs_user_id_key UNIQUE (user_id),
  CONSTRAINT user_data_blobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.user_sync_state (
  user_id uuid NOT NULL,
  payload_inline text,
  payload_storage text NOT NULL DEFAULT 'inline'::text,
  payload_version bigint NOT NULL DEFAULT 1,
  chunk_count integer NOT NULL DEFAULT 0,
  payload_bytes integer NOT NULL DEFAULT 0,
  checksum text NOT NULL DEFAULT ''::text,
  client_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  app_version text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  exam_mode text DEFAULT 'jee'::text,
  CONSTRAINT user_sync_state_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_sync_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_sync_state_chunk_count_check CHECK (chunk_count >= 0),
  CONSTRAINT user_sync_state_exam_mode_check CHECK (exam_mode = ANY (ARRAY['jee'::text, 'neet'::text])),
  CONSTRAINT user_sync_state_inline_max_512kb CHECK (payload_inline IS NULL OR octet_length(payload_inline) <= 524288),
  CONSTRAINT user_sync_state_payload_bytes_check CHECK (payload_bytes >= 0),
  CONSTRAINT user_sync_state_payload_storage_check CHECK (payload_storage = ANY (ARRAY['inline'::text, 'chunked'::text]))
);

CREATE TABLE IF NOT EXISTS public.user_sync_chunks (
  user_id uuid NOT NULL,
  payload_version bigint NOT NULL,
  chunk_index integer NOT NULL,
  chunk_data text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_sync_chunks_pkey PRIMARY KEY (user_id, payload_version, chunk_index),
  CONSTRAINT user_sync_chunks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_sync_chunk_max_512kb CHECK (octet_length(chunk_data) <= 524288),
  CONSTRAINT user_sync_chunks_chunk_index_check CHECK (chunk_index >= 0)
);

CREATE TABLE IF NOT EXISTS public.user_study_aggregate (
  user_id uuid NOT NULL,
  total_seconds_overall bigint NOT NULL DEFAULT 0,
  total_seconds_physics bigint NOT NULL DEFAULT 0,
  total_seconds_chemistry bigint NOT NULL DEFAULT 0,
  total_seconds_maths bigint NOT NULL DEFAULT 0,
  buckets_daily_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  buckets_weekly_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  buckets_monthly_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  video_watch_45d_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  total_seconds_biology bigint DEFAULT 0,
  CONSTRAINT user_study_aggregate_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_study_aggregate_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_study_aggregate_daily_object CHECK (jsonb_typeof(buckets_daily_json) = 'object'::text),
  CONSTRAINT user_study_aggregate_monthly_object CHECK (jsonb_typeof(buckets_monthly_json) = 'object'::text),
  CONSTRAINT user_study_aggregate_total_seconds_chemistry_check CHECK (total_seconds_chemistry >= 0),
  CONSTRAINT user_study_aggregate_total_seconds_maths_check CHECK (total_seconds_maths >= 0),
  CONSTRAINT user_study_aggregate_total_seconds_overall_check CHECK (total_seconds_overall >= 0),
  CONSTRAINT user_study_aggregate_total_seconds_physics_check CHECK (total_seconds_physics >= 0),
  CONSTRAINT user_study_aggregate_video_array CHECK (jsonb_typeof(video_watch_45d_json) = 'array'::text),
  CONSTRAINT user_study_aggregate_weekly_object CHECK (jsonb_typeof(buckets_weekly_json) = 'object'::text)
);

CREATE TABLE IF NOT EXISTS public.study_session_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  session_id text NOT NULL,
  action text NOT NULL,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT study_session_log_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_session UNIQUE (user_id, session_id),
  CONSTRAINT study_session_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT study_session_log_action_check CHECK (action = ANY (ARRAY['INSERT'::text, 'DELETE'::text]))
);

CREATE TABLE IF NOT EXISTS public.entity_change_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  domain text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT entity_change_log_pkey PRIMARY KEY (id),
  CONSTRAINT entity_change_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT entity_change_log_action_check CHECK (action = ANY (ARRAY['UPSERT'::text, 'DELETE'::text]))
);

CREATE TABLE IF NOT EXISTS public.leaderboard_snapshot (
  mode text NOT NULL,
  rank smallint NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  username text,
  avatar_url text,
  hours numeric NOT NULL DEFAULT 0,
  snapshot_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leaderboard_snapshot_pkey PRIMARY KEY (mode, rank),
  CONSTRAINT leaderboard_snapshot_mode_check CHECK (mode = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])),
  CONSTRAINT leaderboard_snapshot_rank_check CHECK (rank >= 1 AND rank <= 10)
);

-- -----------------------------------------------------------------------------
-- 3. Secondary Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_entity_change_log_created_at ON public.entity_change_log USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_entity_change_log_user_client ON public.entity_change_log USING btree (user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_entity_change_log_user_created_at_id ON public.entity_change_log USING btree (user_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_entity_change_log_user_domain_time ON public.entity_change_log USING btree (user_id, domain, created_at);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_peer_relationships_status ON public.peer_relationships USING btree (status);
CREATE INDEX IF NOT EXISTS idx_peer_relationships_user_id_2 ON public.peer_relationships USING btree (user_id_2);
CREATE INDEX IF NOT EXISTS idx_study_session_log_created_at ON public.study_session_log USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_study_session_log_user_id_created_at ON public.study_session_log USING btree (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_sync_chunks_user_version ON public.user_sync_chunks USING btree (user_id, payload_version);

-- -----------------------------------------------------------------------------
-- 4. Functions & RPCs
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  new_code text;
  is_unique boolean;
BEGIN
  IF NEW.invite_code IS NULL THEN
    LOOP
      new_code := upper(substring(md5(random()::text) from 1 for 4));
      SELECT NOT EXISTS(SELECT 1 FROM public.profiles WHERE invite_code = new_code) INTO is_unique;
      IF is_unique THEN
        NEW.invite_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    NEW.completed_at = NOW();
  ELSIF NEW.is_completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.compute_session_duration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL AND NEW.duration_seconds IS NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prune_video_watch_entries(input_entries jsonb)
RETURNS jsonb
LANGUAGE sql
SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(entry), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(input_entries) = 'array' then input_entries else '[]'::jsonb end
  ) as entry
  where entry ? 'watched_date'
    and (entry->>'watched_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and (entry->>'watched_date')::date >= (current_date - interval '45 days')::date;
$function$;

CREATE OR REPLACE FUNCTION public.before_upsert_user_study_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  new.video_watch_45d_json := public.prune_video_watch_entries(new.video_watch_45d_json);
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_weekly_hours_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_week TEXT;
  week_seconds NUMERIC;
  calc_hours NUMERIC;
BEGIN
  current_week := to_char(now(), 'IYYY-"W"IW');

  IF NEW.buckets_weekly_json IS NOT NULL THEN
    IF NEW.buckets_weekly_json ? current_week THEN
      week_seconds := COALESCE((NEW.buckets_weekly_json->current_week->>'overall')::numeric, 0);
      calc_hours := ROUND((week_seconds / 3600.0), 2);
    ELSE
      calc_hours := 0;
    END IF;

    UPDATE public.profiles
    SET weekly_hours = calc_hours
    WHERE id = NEW.user_id
      AND (weekly_hours IS DISTINCT FROM calc_hours);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_leaderboard_invalidation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  heatmap_item JSONB;
  has_anomaly BOOLEAN := FALSE;
BEGIN
  IF NEW.today_study_seconds > 64800 THEN
    has_anomaly := TRUE;
  END IF;

  IF NOT has_anomaly AND NEW.momentum_heatmap IS NOT NULL AND jsonb_typeof(NEW.momentum_heatmap) = 'array' THEN
    FOR heatmap_item IN SELECT * FROM jsonb_array_elements(NEW.momentum_heatmap) LOOP
      IF (heatmap_item->>'seconds')::numeric > 64800 THEN
        has_anomaly := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NEW.weekly_hours > 105 THEN
    has_anomaly := TRUE;
  END IF;

  IF NEW.today_questions > 1000 THEN
    has_anomaly := TRUE;
  END IF;

  NEW.leaderboard_invalidated := has_anomaly;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  generated_code text;
  code_exists boolean;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
begin
  loop
    generated_code :=
      substring(chars from (floor(random()*36)+1)::int for 1) ||
      substring(chars from (floor(random()*36)+1)::int for 1) ||
      substring(chars from (floor(random()*36)+1)::int for 1) ||
      substring(chars from (floor(random()*36)+1)::int for 1);

    select exists(select 1 from public.profiles where invite_code = generated_code) into code_exists;
    exit when not code_exists;
  end loop;

  insert into public.profiles (id, username, display_name, invite_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'custom_username', 'user_' || substring(new.id::text from 1 for 6)),
    coalesce(new.raw_user_meta_data->>'full_name', 'Student'),
    generated_code
  );

  insert into public.peer_visibility_settings (user_id) values (new.id);
  insert into public.live_activity (user_id, is_active) values (new.id, false);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_visible_peer_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT CASE
    WHEN pr.user_id_1 = p_user_id THEN pr.user_id_2
    ELSE pr.user_id_1
  END
  FROM public.peer_relationships pr
  LEFT JOIN public.peer_visibility_settings pvs
    ON pvs.user_id = (CASE WHEN pr.user_id_1 = p_user_id THEN pr.user_id_2 ELSE pr.user_id_1 END)
  WHERE pr.status = 'accepted'
    AND (pr.user_id_1 = p_user_id OR pr.user_id_2 = p_user_id)
    AND pvs.show_agenda IS NOT FALSE;
$function$;

CREATE OR REPLACE FUNCTION public.are_users_peers(uid1 uuid, uid2 uuid)
RETURNS boolean
LANGUAGE sql
SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.peer_relationships
    where (
      (user_id_1 = uid1 and user_id_2 = uid2) or
      (user_id_1 = uid2 and user_id_2 = uid1)
    ) and status = 'accepted'
  );
$function$;

CREATE OR REPLACE FUNCTION public.add_friend_by_code(friend_code text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_friend_id uuid;
  v_user_id uuid := auth.uid();
  v_id_1 uuid;
  v_id_2 uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO v_friend_id FROM public.profiles WHERE invite_code = upper(friend_code);
  IF v_friend_id IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  IF v_friend_id = v_user_id THEN RAISE EXCEPTION 'You cannot add yourself'; END IF;

  IF v_user_id < v_friend_id THEN
    v_id_1 := v_user_id; v_id_2 := v_friend_id;
  ELSE
    v_id_1 := v_friend_id; v_id_2 := v_user_id;
  END IF;

  INSERT INTO public.peer_relationships (user_id_1, user_id_2, status, created_at, updated_at)
  VALUES (v_id_1, v_id_2, 'accepted', now(), now())
  ON CONFLICT (user_id_1, user_id_2) DO UPDATE SET status = 'accepted', updated_at = now();

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.disconnect_peer(friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_id_1 uuid;
  v_id_2 uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_user_id < friend_id THEN
    v_id_1 := v_user_id; v_id_2 := friend_id;
  ELSE
    v_id_1 := friend_id; v_id_2 := v_user_id;
  END IF;
  DELETE FROM public.peer_relationships WHERE user_id_1 = v_id_1 AND user_id_2 = v_id_2;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_profile_by_invite_code(friend_code text)
RETURNS TABLE(display_name text, avatar_url text, invite_code text, banner_url text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.display_name, p.avatar_url, p.invite_code, p.banner_url
  FROM public.profiles p
  WHERE p.invite_code = upper(friend_code)
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_peer_request_by_invite_code(target_code text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  target_id uuid;
  uid1 uuid;
  uid2 uuid;
  req_status text;
begin
  select id into target_id from public.profiles where invite_code = target_code;
  if target_id is null or target_id = auth.uid() then return false; end if;

  if auth.uid() < target_id then
    uid1 := auth.uid(); uid2 := target_id; req_status := 'pending_1_to_2';
  else
    uid1 := target_id; uid2 := auth.uid(); req_status := 'pending_2_to_1';
  end if;

  insert into public.peer_relationships (user_id_1, user_id_2, status)
  values (uid1, uid2, req_status)
  on conflict (user_id_1, user_id_2) do nothing;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_peer_request(peer_uuid uuid, accept boolean)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  uid1 uuid;
  uid2 uuid;
  expected_status text;
begin
  if auth.uid() < peer_uuid then
    uid1 := auth.uid(); uid2 := peer_uuid; expected_status := 'pending_2_to_1';
  else
    uid1 := peer_uuid; uid2 := auth.uid(); expected_status := 'pending_1_to_2';
  end if;

  if accept then
    update public.peer_relationships set status = 'accepted', updated_at = now()
    where user_id_1 = uid1 and user_id_2 = uid2 and status = expected_status;
  else
    delete from public.peer_relationships
    where user_id_1 = uid1 and user_id_2 = uid2 and status = expected_status;
  end if;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.remove_peer(peer_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  uid1 uuid;
  uid2 uuid;
begin
  if auth.uid() < peer_uuid then
    uid1 := auth.uid(); uid2 := peer_uuid;
  else
    uid1 := peer_uuid; uid2 := auth.uid();
  end if;
  delete from public.peer_relationships where user_id_1 = uid1 and user_id_2 = uid2 and status = 'accepted';
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_group_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  done bool;
BEGIN
  done := false;
  WHILE NOT done LOOP
    result := '';
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random() * 36)::int + 1, 1);
    END LOOP;
    done := NOT exists(SELECT 1 FROM public.groups WHERE invite_code = result);
  END LOOP;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_description text, p_banner_preset text, p_avatar_seed text)
RETURNS public.groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_group public.groups;
  new_code text;
BEGIN
  new_code := public.generate_group_invite_code();
  INSERT INTO public.groups (name, description, invite_code, banner_preset, avatar_seed, created_by)
  VALUES (p_name, p_description, new_code, p_banner_preset, p_avatar_seed, auth.uid())
  RETURNING * INTO new_group;
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (new_group.id, auth.uid(), 'owner');
  RETURN new_group;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS SETOF public.group_summary
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    g.id, g.name, g.description, g.invite_code, g.avatar_seed, g.avatar_url,
    g.banner_preset, g.banner_url, g.created_at,
    (SELECT count(*) FROM public.group_members gm2 WHERE gm2.group_id = g.id) as member_count,
    owner_prof.id as owner_id, owner_prof.display_name as owner_name, owner_prof.avatar_url as owner_avatar
  FROM public.groups g
  JOIN public.group_members gm ON gm.group_id = g.id
  JOIN public.group_members owner_gm ON owner_gm.group_id = g.id AND owner_gm.role = 'owner'
  JOIN public.profiles owner_prof ON owner_prof.id = owner_gm.user_id
  WHERE gm.user_id = auth.uid()
  ORDER BY g.name ASC;
$function$;

CREATE OR REPLACE FUNCTION public.join_group_by_code(p_invite_code text)
RETURNS public.groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_group public.groups;
BEGIN
  SELECT * INTO target_group FROM public.groups WHERE invite_code = upper(p_invite_code);
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (target_group.id, auth.uid(), 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN target_group;
END;
$function$;

CREATE OR REPLACE FUNCTION public.kick_group_member(p_group_id uuid, p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid();
  IF user_role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = p_target_user_id AND role = 'owner') THEN
    RAISE EXCEPTION 'Cannot kick owner';
  END IF;
  DELETE FROM public.group_members WHERE group_id = p_group_id AND user_id = p_target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_owner boolean;
  oldest_member_id uuid;
BEGIN
  SELECT (role = 'owner') INTO is_owner FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid();
  IF NOT FOUND THEN RETURN; END IF;
  DELETE FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid();
  IF is_owner THEN
    SELECT user_id INTO oldest_member_id FROM public.group_members WHERE group_id = p_group_id ORDER BY joined_at ASC LIMIT 1;
    IF oldest_member_id IS NOT NULL THEN
      UPDATE public.group_members SET role = 'owner' WHERE group_id = p_group_id AND user_id = oldest_member_id;
    ELSE
      DELETE FROM public.groups WHERE id = p_group_id;
    END IF;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_group_profile(
  p_group_id uuid, p_name text, p_description text, p_banner_preset text,
  p_avatar_seed text, p_banner_url text, p_avatar_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid();
  IF user_role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;
  UPDATE public.groups
  SET
    name = COALESCE(p_name, name),
    description = p_description,
    banner_preset = COALESCE(p_banner_preset, banner_preset),
    avatar_seed = COALESCE(p_avatar_seed, avatar_seed),
    banner_url = p_banner_url,
    avatar_url = p_avatar_url
  WHERE id = p_group_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.merge_video_logs(new_logs jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _existing_logs jsonb;
  _merged_logs jsonb;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT video_watch_45d_json INTO _existing_logs FROM user_study_aggregate WHERE user_id = _user_id;
  IF _existing_logs IS NULL OR jsonb_typeof(_existing_logs) != 'array' THEN
    _existing_logs := '[]'::jsonb;
  END IF;

  WITH existing AS (
    SELECT e->>'video_id' AS video_id, e->>'watched_date' AS watched_date,
           COALESCE((e->>'watched_seconds')::int, 0) AS watched_seconds,
           e->>'video_name' AS video_name, e->>'subject' AS subject
    FROM jsonb_array_elements(CASE WHEN jsonb_array_length(_existing_logs) > 0 THEN _existing_logs ELSE '[]'::jsonb END) AS e
  ),
  incoming AS (
    SELECT i->>'video_id' AS video_id, i->>'watched_date' AS watched_date,
           COALESCE((i->>'watched_seconds')::int, 0) AS watched_seconds,
           i->>'video_name' AS video_name, i->>'subject' AS subject
    FROM jsonb_array_elements(CASE WHEN jsonb_array_length(new_logs) > 0 THEN new_logs ELSE '[]'::jsonb END) AS i
  ),
  all_keys AS (
    SELECT video_id, watched_date FROM existing
    UNION
    SELECT video_id, watched_date FROM incoming
  ),
  merged AS (
    SELECT k.video_id, k.watched_date,
           GREATEST(COALESCE(e.watched_seconds, 0), COALESCE(i.watched_seconds, 0)) AS watched_seconds,
           COALESCE(i.video_name, e.video_name) AS video_name,
           COALESCE(i.subject, e.subject) AS subject
    FROM all_keys k
    LEFT JOIN existing e ON k.video_id = e.video_id AND k.watched_date = e.watched_date
    LEFT JOIN incoming i ON k.video_id = i.video_id AND k.watched_date = i.watched_date
  ),
  ordered AS (
    SELECT * FROM merged ORDER BY watched_date ASC, video_id ASC
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'video_id', video_id, 'watched_date', watched_date,
    'watched_seconds', watched_seconds, 'video_name', video_name, 'subject', subject
  )), '[]'::jsonb) INTO _merged_logs
  FROM ordered;

  INSERT INTO user_study_aggregate (user_id, video_watch_45d_json)
  VALUES (_user_id, _merged_logs)
  ON CONFLICT (user_id) DO UPDATE SET video_watch_45d_json = EXCLUDED.video_watch_45d_json;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_snapshot_at TIMESTAMPTZ := clock_timestamp();
  today_ist DATE := (v_snapshot_at AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
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
      SUM(CASE WHEN i <= 0 THEN secs ELSE 0 END) AS daily_secs,
      SUM(CASE WHEN i <= 6 THEN secs ELSE 0 END) AS weekly_secs,
      SUM(secs)                                   AS monthly_secs
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

CREATE OR REPLACE FUNCTION public.cron_prune_stale_session_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.study_session_log
  WHERE id IN (
    SELECT id FROM public.study_session_log
    WHERE created_at < (now() - interval '45 days')
    LIMIT 2000
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cron_prune_orphaned_chunks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  delete from public.user_sync_chunks c
  using public.user_sync_state s
  where c.user_id = s.user_id
    and c.payload_version != s.payload_version;
$function$;

CREATE OR REPLACE FUNCTION public.cron_prune_stale_entity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.entity_change_log
  WHERE id IN (
    SELECT id FROM public.entity_change_log
    WHERE created_at < (now() - interval '45 days')
    LIMIT 2000
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cron_prune_job_run_details()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, cron'
AS $function$
BEGIN
  DELETE FROM cron.job_run_details
  WHERE runid IN (
    SELECT runid FROM cron.job_run_details
    WHERE start_time < (now() - interval '7 days')
    LIMIT 2000
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cron_prune_revoked_refresh_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, auth'
AS $function$
BEGIN
  -- Keep 14 days of revoked tokens for GoTrue token-reuse security detection.
  DELETE FROM auth.refresh_tokens
  WHERE id IN (
    SELECT id FROM auth.refresh_tokens
    WHERE revoked = true
      AND updated_at < (now() - interval '14 days')
    ORDER BY id
    LIMIT 2000
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cron_prune_job_run_details() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cron_prune_revoked_refresh_tokens() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

DROP TRIGGER IF EXISTS trg_groups_updated_at ON public.groups;
CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ensure_invite_code ON public.profiles;
CREATE TRIGGER ensure_invite_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_invite_code();

DROP TRIGGER IF EXISTS trg_profiles_leaderboard_guardrail_insert ON public.profiles;
CREATE TRIGGER trg_profiles_leaderboard_guardrail_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_leaderboard_invalidation();

DROP TRIGGER IF EXISTS trg_profiles_leaderboard_guardrail_update ON public.profiles;
CREATE TRIGGER trg_profiles_leaderboard_guardrail_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    old.today_study_seconds IS DISTINCT FROM new.today_study_seconds
    OR old.momentum_heatmap IS DISTINCT FROM new.momentum_heatmap
    OR old.weekly_hours IS DISTINCT FROM new.weekly_hours
    OR old.today_questions IS DISTINCT FROM new.today_questions
  )
  EXECUTE FUNCTION public.check_leaderboard_invalidation();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (old.* IS DISTINCT FROM new.*)
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS zz_profiles_suppress_redundant_updates ON public.profiles;
CREATE TRIGGER zz_profiles_suppress_redundant_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION suppress_redundant_updates_trigger();

DROP TRIGGER IF EXISTS trg_user_data_blobs_updated_at ON public.user_data_blobs;
CREATE TRIGGER trg_user_data_blobs_updated_at
  BEFORE UPDATE ON public.user_data_blobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_study_aggregate_before_upsert ON public.user_study_aggregate;
CREATE TRIGGER trg_user_study_aggregate_before_upsert
  BEFORE INSERT OR UPDATE ON public.user_study_aggregate
  FOR EACH ROW EXECUTE FUNCTION public.before_upsert_user_study_aggregate();

DROP TRIGGER IF EXISTS trg_sync_weekly_hours_to_profile_insert ON public.user_study_aggregate;
CREATE TRIGGER trg_sync_weekly_hours_to_profile_insert
  AFTER INSERT ON public.user_study_aggregate
  FOR EACH ROW
  WHEN (new.buckets_weekly_json IS NOT NULL)
  EXECUTE FUNCTION public.sync_weekly_hours_to_profile();

DROP TRIGGER IF EXISTS trg_sync_weekly_hours_to_profile_update ON public.user_study_aggregate;
CREATE TRIGGER trg_sync_weekly_hours_to_profile_update
  AFTER UPDATE ON public.user_study_aggregate
  FOR EACH ROW
  WHEN (old.buckets_weekly_json IS DISTINCT FROM new.buckets_weekly_json)
  EXECUTE FUNCTION public.sync_weekly_hours_to_profile();

DROP TRIGGER IF EXISTS trg_user_sync_state_updated_at ON public.user_sync_state;
CREATE TRIGGER trg_user_sync_state_updated_at
  BEFORE UPDATE ON public.user_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Row-Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_visibility_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_session_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sync_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public chapters readable" ON public.chapters;
CREATE POLICY "Public chapters readable" ON public.chapters
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own entity change logs." ON public.entity_change_log;
CREATE POLICY "Users can insert their own entity change logs." ON public.entity_change_log
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own entity change logs." ON public.entity_change_log;
CREATE POLICY "Users can view their own entity change logs." ON public.entity_change_log
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
CREATE POLICY "group_members_select_policy" ON public.group_members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
CREATE POLICY "groups_select_policy" ON public.groups
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
CREATE POLICY "groups_insert_policy" ON public.groups
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
CREATE POLICY "groups_update_policy" ON public.groups
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = groups.id
        AND gm.user_id = (SELECT auth.uid())
        AND gm.role = ANY (ARRAY['owner'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "leaderboard_snapshot_select" ON public.leaderboard_snapshot;
CREATE POLICY "leaderboard_snapshot_select" ON public.leaderboard_snapshot
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "live_activity_insert_optimized" ON public.live_activity;
CREATE POLICY "live_activity_insert_optimized" ON public.live_activity
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "live_activity_select_v2" ON public.live_activity;
CREATE POLICY "live_activity_select_v2" ON public.live_activity
  FOR SELECT TO authenticated USING (
    (SELECT auth.uid()) = user_id
    OR user_id IN (SELECT public.get_visible_peer_ids((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "live_activity_update_optimized" ON public.live_activity;
CREATE POLICY "live_activity_update_optimized" ON public.live_activity
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "peer_relationships_select_optimized" ON public.peer_relationships;
CREATE POLICY "peer_relationships_select_optimized" ON public.peer_relationships
  FOR SELECT USING ((SELECT auth.uid()) = user_id_1 OR (SELECT auth.uid()) = user_id_2);

DROP POLICY IF EXISTS "peer_relationships_insert_optimized" ON public.peer_relationships;
CREATE POLICY "peer_relationships_insert_optimized" ON public.peer_relationships
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id_1 OR (SELECT auth.uid()) = user_id_2);

DROP POLICY IF EXISTS "peer_relationships_update_optimized" ON public.peer_relationships;
CREATE POLICY "peer_relationships_update_optimized" ON public.peer_relationships
  FOR UPDATE USING ((SELECT auth.uid()) = user_id_1 OR (SELECT auth.uid()) = user_id_2);

DROP POLICY IF EXISTS "peer_relationships_delete_optimized" ON public.peer_relationships;
CREATE POLICY "peer_relationships_delete_optimized" ON public.peer_relationships
  FOR DELETE USING ((SELECT auth.uid()) = user_id_1 OR (SELECT auth.uid()) = user_id_2);

DROP POLICY IF EXISTS "peer_visibility_select_optimized" ON public.peer_visibility_settings;
CREATE POLICY "peer_visibility_select_optimized" ON public.peer_visibility_settings
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "peer_visibility_insert_optimized" ON public.peer_visibility_settings;
CREATE POLICY "peer_visibility_insert_optimized" ON public.peer_visibility_settings
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "peer_visibility_update_optimized" ON public.peer_visibility_settings;
CREATE POLICY "peer_visibility_update_optimized" ON public.peer_visibility_settings
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users insert own profiles" ON public.profiles;
CREATE POLICY "Users insert own profiles" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users update own profiles" ON public.profiles;
CREATE POLICY "Users update own profiles" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users delete own profiles" ON public.profiles;
CREATE POLICY "Users delete own profiles" ON public.profiles
  FOR DELETE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own study session logs" ON public.study_session_log;
CREATE POLICY "Users can insert own study session logs" ON public.study_session_log
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own study session logs" ON public.study_session_log;
CREATE POLICY "Users can view own study session logs" ON public.study_session_log
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users cannot update study session logs" ON public.study_session_log;
CREATE POLICY "Users cannot update study session logs" ON public.study_session_log
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Users cannot delete study session logs" ON public.study_session_log;
CREATE POLICY "Users cannot delete study session logs" ON public.study_session_log
  FOR DELETE USING (false);

DROP POLICY IF EXISTS "Users read own blob" ON public.user_data_blobs;
CREATE POLICY "Users read own blob" ON public.user_data_blobs
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own blob" ON public.user_data_blobs;
CREATE POLICY "Users insert own blob" ON public.user_data_blobs
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own blob" ON public.user_data_blobs;
CREATE POLICY "Users update own blob" ON public.user_data_blobs
  FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own blob" ON public.user_data_blobs;
CREATE POLICY "Users delete own blob" ON public.user_data_blobs
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_study_aggregate_select_own" ON public.user_study_aggregate;
CREATE POLICY "user_study_aggregate_select_own" ON public.user_study_aggregate
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_study_aggregate_insert_own" ON public.user_study_aggregate;
CREATE POLICY "user_study_aggregate_insert_own" ON public.user_study_aggregate
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_study_aggregate_update_own" ON public.user_study_aggregate;
CREATE POLICY "user_study_aggregate_update_own" ON public.user_study_aggregate
  FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_study_aggregate_delete_own" ON public.user_study_aggregate;
CREATE POLICY "user_study_aggregate_delete_own" ON public.user_study_aggregate
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_chunks_select_own" ON public.user_sync_chunks;
CREATE POLICY "user_sync_chunks_select_own" ON public.user_sync_chunks
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_chunks_insert_own" ON public.user_sync_chunks;
CREATE POLICY "user_sync_chunks_insert_own" ON public.user_sync_chunks
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_chunks_update_own" ON public.user_sync_chunks;
CREATE POLICY "user_sync_chunks_update_own" ON public.user_sync_chunks
  FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_chunks_delete_own" ON public.user_sync_chunks;
CREATE POLICY "user_sync_chunks_delete_own" ON public.user_sync_chunks
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_state_select_own" ON public.user_sync_state;
CREATE POLICY "user_sync_state_select_own" ON public.user_sync_state
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_state_insert_own" ON public.user_sync_state;
CREATE POLICY "user_sync_state_insert_own" ON public.user_sync_state
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_state_update_own" ON public.user_sync_state;
CREATE POLICY "user_sync_state_update_own" ON public.user_sync_state
  FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_sync_state_delete_own" ON public.user_sync_state;
CREATE POLICY "user_sync_state_delete_own" ON public.user_sync_state
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 7. Storage Buckets & Policies
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users Upload Own Avatar" ON storage.objects;
CREATE POLICY "Users Upload Own Avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Users Update Own Avatar" ON storage.objects;
CREATE POLICY "Users Update Own Avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text
  ) WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Users Delete Own Avatar" ON storage.objects;
CREATE POLICY "Users Delete Own Avatar" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- -----------------------------------------------------------------------------
-- 8. pg_cron Schedules
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_job text;
BEGIN
  FOREACH v_job IN ARRAY ARRAY[
    'refresh-leaderboard-snapshot',
    'prune-stale-session-logs',
    'prune-orphaned-chunks',
    'cron_prune_stale_entity_logs',
    'prune-cron-job-run-details',
    'prune-revoked-refresh-tokens'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job) THEN
      PERFORM cron.unschedule(v_job);
    END IF;
  END LOOP;

  PERFORM cron.schedule('refresh-leaderboard-snapshot', '5,35 * * * *', 'SELECT public.refresh_leaderboard_snapshot()');
  PERFORM cron.schedule('prune-stale-session-logs',     '10 2 * * *',   'SELECT public.cron_prune_stale_session_logs()');
  PERFORM cron.schedule('prune-orphaned-chunks',        '20 2 * * *',   'SELECT public.cron_prune_orphaned_chunks()');
  PERFORM cron.schedule('cron_prune_stale_entity_logs', '30 2 * * *',   'SELECT public.cron_prune_stale_entity_logs()');
  PERFORM cron.schedule('prune-cron-job-run-details',   '40 2 * * *',   'SELECT public.cron_prune_job_run_details()');
  PERFORM cron.schedule('prune-revoked-refresh-tokens', '50 2 * * *',   'SELECT public.cron_prune_revoked_refresh_tokens()');
END $$;

COMMIT;
