-- 1. Enable pg_cron for asynchronous background tasks
create extension if not exists pg_cron;

-- 2. Drop synchronous triggers that caused high latency on sync
drop trigger if exists trg_prune_session_logs_on_sync on public.user_sync_state;
drop trigger if exists trg_prune_orphaned_chunks_on_sync on public.user_sync_state;

-- Create modified functions that run for ALL users periodically instead of per NEW.user_id
CREATE OR REPLACE FUNCTION public.cron_prune_stale_session_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    delete from public.study_session_log
    where created_at < (now() - interval '45 days');
$$;

CREATE OR REPLACE FUNCTION public.cron_prune_orphaned_chunks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    -- Delete chunks that do not match the current payload_version of the user in user_sync_state
    delete from public.user_sync_chunks c
    using public.user_sync_state s
    where c.user_id = s.user_id 
      and c.payload_version != s.payload_version;
$$;

-- Schedule the cron jobs to run daily at 2 AM
SELECT cron.schedule('prune-stale-session-logs', '0 2 * * *', 'SELECT public.cron_prune_stale_session_logs()');
SELECT cron.schedule('prune-orphaned-chunks', '0 2 * * *', 'SELECT public.cron_prune_orphaned_chunks()');

-- 3. Optimize and consolidate RLS Policies (use `(SELECT auth.uid())`)

-- profiles
drop policy if exists "Profiles readable by self" on public.profiles;
drop policy if exists "Profiles editable by self" on public.profiles;
drop policy if exists "Profiles readable by peers" on public.profiles;
drop policy if exists "Profiles readable by related peers" on public.profiles;

CREATE POLICY "Profiles readable by peers optimized" ON public.profiles
FOR SELECT USING (
  public.are_users_peers((SELECT auth.uid()), id)
);

-- peer_relationships
drop policy if exists "Users can view their own relationships" on public.peer_relationships;
drop policy if exists "Users can modify their own relationships" on public.peer_relationships;
drop policy if exists "Users can update their own relationships" on public.peer_relationships;
drop policy if exists "Users can delete their own relationships" on public.peer_relationships;
drop policy if exists "peer_relationships_select_policy" on public.peer_relationships;
drop policy if exists "peer_relationships_delete_policy" on public.peer_relationships;

CREATE POLICY "peer_relationships_select_optimized" ON public.peer_relationships
FOR SELECT USING (
  (SELECT auth.uid()) = user_id_1 OR (SELECT auth.uid()) = user_id_2
);
CREATE POLICY "peer_relationships_insert_optimized" ON public.peer_relationships
FOR INSERT WITH CHECK (
  (SELECT auth.uid()) = user_id_1 OR (SELECT auth.uid()) = user_id_2
);
CREATE POLICY "peer_relationships_update_optimized" ON public.peer_relationships
FOR UPDATE USING (
  (SELECT auth.uid()) = user_id_1 OR (SELECT auth.uid()) = user_id_2
);
CREATE POLICY "peer_relationships_delete_optimized" ON public.peer_relationships
FOR DELETE USING (
  (SELECT auth.uid()) = user_id_1 OR (SELECT auth.uid()) = user_id_2
);

-- peer_visibility_settings
drop policy if exists "Settings readable by self" on public.peer_visibility_settings;
drop policy if exists "Settings editable by self" on public.peer_visibility_settings;
drop policy if exists "peer_visibility_select_policy" on public.peer_visibility_settings;
drop policy if exists "peer_visibility_insert_policy" on public.peer_visibility_settings;
drop policy if exists "peer_visibility_update_policy" on public.peer_visibility_settings;

CREATE POLICY "peer_visibility_select_optimized" ON public.peer_visibility_settings
FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "peer_visibility_insert_optimized" ON public.peer_visibility_settings
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "peer_visibility_update_optimized" ON public.peer_visibility_settings
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- live_activity
drop policy if exists "Live activity readable by self" on public.live_activity;
drop policy if exists "Live activity readable by peers" on public.live_activity;
drop policy if exists "Live activity editable by self" on public.live_activity;
drop policy if exists "live_activity_select_policy" on public.live_activity;
drop policy if exists "live_activity_insert_policy" on public.live_activity;
drop policy if exists "live_activity_update_policy" on public.live_activity;

CREATE POLICY "live_activity_select_optimized" ON public.live_activity
FOR SELECT USING (
  (SELECT auth.uid()) = user_id OR
  (
    public.are_users_peers((SELECT auth.uid()), user_id) AND 
    (SELECT show_live_activity FROM public.peer_visibility_settings WHERE user_id = public.live_activity.user_id LIMIT 1)
  )
);
CREATE POLICY "live_activity_insert_optimized" ON public.live_activity
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "live_activity_update_optimized" ON public.live_activity
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- 4. Add missing index on peer_relationships(user_id_2)
CREATE INDEX IF NOT EXISTS idx_peer_relationships_user_id_2 ON public.peer_relationships USING btree (user_id_2);

-- 5. Optimize study_session_log index
DROP INDEX IF EXISTS study_session_log_user_id_created_at_idx;
CREATE INDEX IF NOT EXISTS idx_study_session_log_user_id_created_at_id ON public.study_session_log USING btree (user_id, created_at, id);
