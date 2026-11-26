-- Migration to add entity_change_log for Layer 1
CREATE TABLE IF NOT EXISTS public.entity_change_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id text NOT NULL,
    domain text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL CHECK (action IN ('UPSERT', 'DELETE')),
    payload jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_change_log_user_domain_time ON public.entity_change_log(user_id, domain, created_at);
CREATE INDEX IF NOT EXISTS idx_entity_change_log_user_client ON public.entity_change_log(user_id, client_id);

ALTER TABLE public.entity_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own entity change logs."
    ON public.entity_change_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own entity change logs."
    ON public.entity_change_log FOR SELECT
    USING (auth.uid() = user_id);

-- =============================================================================
-- Prune Stale Entity Logs (45-Day Retention)
-- =============================================================================

create or replace function public.prune_stale_entity_logs(target_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
    delete from public.entity_change_log
    where user_id = target_user_id
      and created_at < (now() - interval '45 days');
$$;

create or replace function public.trigger_prune_stale_entity_logs()
returns trigger
language plpgsql
security definer
as $$
begin
    perform public.prune_stale_entity_logs(NEW.user_id);
    return NEW;
end;
$$;

drop trigger if exists trg_prune_entity_logs_on_sync on public.user_sync_state;
create trigger trg_prune_entity_logs_on_sync
after insert or update on public.user_sync_state
for each row
execute function public.trigger_prune_stale_entity_logs();

