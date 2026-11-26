-- Step 3: Harden SECURITY DEFINER helper functions used by remote sync
-- Generated on 2026-03-07

begin;

-- Restrict chunk pruning helper to the caller's own user_id even under SECURITY DEFINER.
create or replace function public.prune_stale_sync_chunks(target_user_id uuid, keep_payload_version bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if target_user_id <> auth.uid() then
    raise exception 'forbidden: target_user_id must match auth.uid()';
  end if;

  delete from public.user_sync_chunks
  where user_id = target_user_id
    and payload_version <> keep_payload_version;
end;
$$;

-- Lock down execute privileges on SECURITY DEFINER helpers.
revoke all on function public.prune_stale_sync_chunks(uuid, bigint) from public;
revoke all on function public.prune_stale_sync_chunks(uuid, bigint) from anon;
revoke all on function public.prune_stale_sync_chunks(uuid, bigint) from authenticated;
grant execute on function public.prune_stale_sync_chunks(uuid, bigint) to authenticated;

revoke all on function public.prune_all_video_watch_logs() from public;
revoke all on function public.prune_all_video_watch_logs() from anon;
revoke all on function public.prune_all_video_watch_logs() from authenticated;
grant execute on function public.prune_all_video_watch_logs() to service_role;

commit;
