-- Step 2: Supabase schema for remote sync + study aggregates + chunked payloads
-- Generated on 2026-03-07

begin;

-- Keep updated_at consistent across tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Core compressed sync state (single manifest row per user)
create table if not exists public.user_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload_inline text,
  payload_storage text not null default 'inline' check (payload_storage in ('inline', 'chunked')),
  payload_version bigint not null default 1,
  chunk_count integer not null default 0 check (chunk_count >= 0),
  payload_bytes integer not null default 0 check (payload_bytes >= 0),
  checksum text not null default '',
  client_updated_at timestamptz not null default now(),
  app_version text,
  updated_at timestamptz not null default now(),
  constraint user_sync_state_inline_max_512kb
    check (payload_inline is null or octet_length(payload_inline) <= 524288)
);

-- 2) Chunk table for compressed payloads > 512KB
create table if not exists public.user_sync_chunks (
  user_id uuid not null references auth.users(id) on delete cascade,
  payload_version bigint not null,
  chunk_index integer not null check (chunk_index >= 0),
  chunk_data text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, payload_version, chunk_index),
  constraint user_sync_chunk_max_512kb
    check (octet_length(chunk_data) <= 524288)
);

create index if not exists idx_user_sync_chunks_lookup
  on public.user_sync_chunks (user_id, payload_version);

-- 3) Aggregated study analytics + cross-app video watch log (last 45 days)
create table if not exists public.user_study_aggregate (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_seconds_overall bigint not null default 0 check (total_seconds_overall >= 0),
  total_seconds_physics bigint not null default 0 check (total_seconds_physics >= 0),
  total_seconds_chemistry bigint not null default 0 check (total_seconds_chemistry >= 0),
  total_seconds_maths bigint not null default 0 check (total_seconds_maths >= 0),
  buckets_daily_json jsonb not null default '{}'::jsonb,
  buckets_weekly_json jsonb not null default '{}'::jsonb,
  buckets_monthly_json jsonb not null default '{}'::jsonb,
  video_watch_45d_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_study_aggregate_daily_object check (jsonb_typeof(buckets_daily_json) = 'object'),
  constraint user_study_aggregate_weekly_object check (jsonb_typeof(buckets_weekly_json) = 'object'),
  constraint user_study_aggregate_monthly_object check (jsonb_typeof(buckets_monthly_json) = 'object'),
  constraint user_study_aggregate_video_array check (jsonb_typeof(video_watch_45d_json) = 'array')
);

-- Retention helper: keep only entries whose watched_date is within the last 45 days.
-- Expected entry shape in video_watch_45d_json[]:
-- {"video_id": "...", "video_name": "...", "subject": "physics|chemistry|maths", "watched_seconds": 123, "watched_date": "YYYY-MM-DD"}
create or replace function public.prune_video_watch_entries(input_entries jsonb)
returns jsonb
language sql
as $$
  select coalesce(jsonb_agg(entry), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(input_entries) = 'array' then input_entries else '[]'::jsonb end
  ) as entry
  where entry ? 'watched_date'
    and (entry->>'watched_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and (entry->>'watched_date')::date >= (current_date - interval '45 days')::date;
$$;

create or replace function public.before_upsert_user_study_aggregate()
returns trigger
language plpgsql
as $$
begin
  new.video_watch_45d_json := public.prune_video_watch_entries(new.video_watch_45d_json);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_sync_state_updated_at on public.user_sync_state;
create trigger trg_user_sync_state_updated_at
before update on public.user_sync_state
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_study_aggregate_before_upsert on public.user_study_aggregate;
create trigger trg_user_study_aggregate_before_upsert
before insert or update on public.user_study_aggregate
for each row
execute function public.before_upsert_user_study_aggregate();

-- Optional maintenance function for scheduled pruning (DB-side retention enforcement)
create or replace function public.prune_all_video_watch_logs()
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_study_aggregate
  set
    video_watch_45d_json = public.prune_video_watch_entries(video_watch_45d_json),
    updated_at = now();
$$;

-- Optional helper: keep chunk table small after a successful manifest update.
create or replace function public.prune_stale_sync_chunks(target_user_id uuid, keep_payload_version bigint)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.user_sync_chunks
  where user_id = target_user_id
    and payload_version <> keep_payload_version;
$$;

-- If pg_cron is enabled, schedule daily cleanup (optional):
-- select cron.schedule(
--   'prune-video-watch-logs-daily',
--   '15 2 * * *',
--   $$select public.prune_all_video_watch_logs();$$
-- );

-- 4) Row Level Security
alter table public.user_sync_state enable row level security;
alter table public.user_sync_chunks enable row level security;
alter table public.user_study_aggregate enable row level security;

-- user_sync_state policies

drop policy if exists "user_sync_state_select_own" on public.user_sync_state;
create policy "user_sync_state_select_own"
  on public.user_sync_state for select
  using (auth.uid() = user_id);

drop policy if exists "user_sync_state_insert_own" on public.user_sync_state;
create policy "user_sync_state_insert_own"
  on public.user_sync_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_sync_state_update_own" on public.user_sync_state;
create policy "user_sync_state_update_own"
  on public.user_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_sync_state_delete_own" on public.user_sync_state;
create policy "user_sync_state_delete_own"
  on public.user_sync_state for delete
  using (auth.uid() = user_id);

-- user_sync_chunks policies

drop policy if exists "user_sync_chunks_select_own" on public.user_sync_chunks;
create policy "user_sync_chunks_select_own"
  on public.user_sync_chunks for select
  using (auth.uid() = user_id);

drop policy if exists "user_sync_chunks_insert_own" on public.user_sync_chunks;
create policy "user_sync_chunks_insert_own"
  on public.user_sync_chunks for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_sync_chunks_update_own" on public.user_sync_chunks;
create policy "user_sync_chunks_update_own"
  on public.user_sync_chunks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_sync_chunks_delete_own" on public.user_sync_chunks;
create policy "user_sync_chunks_delete_own"
  on public.user_sync_chunks for delete
  using (auth.uid() = user_id);

-- user_study_aggregate policies

drop policy if exists "user_study_aggregate_select_own" on public.user_study_aggregate;
create policy "user_study_aggregate_select_own"
  on public.user_study_aggregate for select
  using (auth.uid() = user_id);

drop policy if exists "user_study_aggregate_insert_own" on public.user_study_aggregate;
create policy "user_study_aggregate_insert_own"
  on public.user_study_aggregate for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_study_aggregate_update_own" on public.user_study_aggregate;
create policy "user_study_aggregate_update_own"
  on public.user_study_aggregate for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_study_aggregate_delete_own" on public.user_study_aggregate;
create policy "user_study_aggregate_delete_own"
  on public.user_study_aggregate for delete
  using (auth.uid() = user_id);

-- Restrict anonymous role; allow authenticated operations guarded by RLS.
revoke all on public.user_sync_state from anon;
revoke all on public.user_sync_chunks from anon;
revoke all on public.user_study_aggregate from anon;

grant select, insert, update, delete on public.user_sync_state to authenticated;
grant select, insert, update, delete on public.user_sync_chunks to authenticated;
grant select, insert, update, delete on public.user_study_aggregate to authenticated;

commit;
