-- Migration: Trigger & Maintenance Offloading (Milestone 2)
-- Description: Drops inline log pruning trigger, introduces cron_prune_stale_entity_logs(),
-- schedules background retention pruning with pg_cron, and optimizes sync_weekly_hours_to_profile() guard clause.

-- 1. Drop inline synchronous trigger on user_sync_state
DROP TRIGGER IF EXISTS trg_prune_entity_logs_on_sync ON public.user_sync_state;

-- 2. Create retention pruning PL/pgSQL function for entity_change_log
CREATE OR REPLACE FUNCTION public.cron_prune_stale_entity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.entity_change_log
  WHERE created_at < (now() - interval '45 days');
END;
$function$;

-- 3. Schedule cron job with unschedule guard and execute seed invocation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron_prune_stale_entity_logs') THEN
    PERFORM cron.unschedule('cron_prune_stale_entity_logs');
  END IF;
  PERFORM cron.schedule('cron_prune_stale_entity_logs', '0 2 * * *', $$SELECT public.cron_prune_stale_entity_logs()$$);
END $$;

-- 4. Update sync_weekly_hours_to_profile trigger function with guard clause
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
