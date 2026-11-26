-- -----------------------------------------------------------------------------
-- Migration: Add Automated Retention Policies for Supabase Storage Limits
-- Purpose: 
-- 1. Automatically prune `study_session_log` entries older than 45 days.
--    (We do this via a trigger on `user_sync_state` to only sweep active users).
-- 2. Automatically delete orphaned `user_sync_chunks` when a new
--    `payload_version` is written to `user_sync_state`.
-- -----------------------------------------------------------------------------

begin;

-- =============================================================================
-- 1. Prune Stale Session Logs (45-Day Retention)
-- =============================================================================

-- The function that does the actual deletion for a specific user
create or replace function public.prune_stale_session_logs(target_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
    delete from public.study_session_log
    where user_id = target_user_id
      and created_at < (now() - interval '45 days');
$$;

-- Trigger function that calls the above prune function whenever a user syncs
create or replace function public.trigger_prune_stale_session_logs()
returns trigger
language plpgsql
security definer
as $$
begin
    -- Perform the cleanup in the background of the transaction
    perform public.prune_stale_session_logs(NEW.user_id);
    return NEW;
end;
$$;

-- Attach the trigger to user_sync_state
-- We use AFTER UPDATE / INSERT so the main payload commit succeeds first
drop trigger if exists trg_prune_session_logs_on_sync on public.user_sync_state;
create trigger trg_prune_session_logs_on_sync
after insert or update on public.user_sync_state
for each row
execute function public.trigger_prune_stale_session_logs();


-- =============================================================================
-- 2. Prune Orphaned Sync Chunks Automatically
-- =============================================================================

-- Trigger function to delete any chunks that do not match the new payload_version
create or replace function public.trigger_prune_orphaned_chunks()
returns trigger
language plpgsql
security definer
as $$
begin
    -- If a user uploads a new payload_version (even if it's inline),
    -- drop all chunks belonging to older versions to free up the 500MB DB limit.
    delete from public.user_sync_chunks
    where user_id = NEW.user_id 
      and payload_version != NEW.payload_version;
      
    return NEW;
end;
$$;

-- Attach trigger to user_sync_state
drop trigger if exists trg_prune_orphaned_chunks_on_sync on public.user_sync_state;
create trigger trg_prune_orphaned_chunks_on_sync
after insert or update on public.user_sync_state
for each row
execute function public.trigger_prune_orphaned_chunks();

commit;
