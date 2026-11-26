-- =============================================================================
-- Migration: 20260721_harden_function_search_path.sql
-- Security hardening: pin search_path on three SECURITY DEFINER functions.
--
-- The Supabase security linter (0011_function_search_path_mutable) flagged these
-- functions as having a role-mutable search_path. A SECURITY DEFINER function
-- without a fixed search_path can be hijacked if an attacker creates objects in
-- a schema that resolves earlier on the path, causing unqualified names to bind
-- to attacker-controlled objects. Fix: add `SET search_path TO 'public'` and
-- schema-qualify table references. Bodies are otherwise unchanged from live.
-- =============================================================================

BEGIN;

-- 1. sync_weekly_hours_to_profile (trigger on user_study_aggregate)
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

  IF NEW.buckets_weekly_json IS NOT NULL AND NEW.buckets_weekly_json ? current_week THEN
    week_seconds := COALESCE((NEW.buckets_weekly_json->current_week->>'overall')::numeric, 0);
    calc_hours := ROUND((week_seconds / 3600.0), 2);

    UPDATE public.profiles
    SET weekly_hours = calc_hours
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. disconnect_peer (RPC called by client)
CREATE OR REPLACE FUNCTION public.disconnect_peer(friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_id_1 uuid;
  v_id_2 uuid;
BEGIN
  -- Validate user is logged in
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Order the IDs to match constraint chk_user_id_ordering (user_id_1 < user_id_2)
  IF v_user_id < friend_id THEN
    v_id_1 := v_user_id;
    v_id_2 := friend_id;
  ELSE
    v_id_1 := friend_id;
    v_id_2 := v_user_id;
  END IF;

  -- Delete the peer relationship row
  DELETE FROM public.peer_relationships
  WHERE user_id_1 = v_id_1 AND user_id_2 = v_id_2;

  RETURN true;
END;
$function$;

-- 3. trigger_prune_stale_entity_logs (trigger on user_sync_state)
CREATE OR REPLACE FUNCTION public.trigger_prune_stale_entity_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.prune_stale_entity_logs(NEW.user_id);
  RETURN NEW;
END;
$function$;

COMMIT;

