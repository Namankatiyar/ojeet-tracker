# Supabase Step 2 Setup

This project migration adds:
- `user_sync_state` (compressed sync manifest)
- `user_sync_chunks` (chunked payload support for >512KB compressed state)
- `user_study_aggregate` (aggregated totals, buckets, and 45-day video log JSON)
- RLS policies for per-user isolation
- DB-side video retention helper + trigger
- optional helper cleanup function for old payload chunks

## Apply migration

Run this SQL in Supabase SQL Editor (or through Supabase CLI migrations):

- `supabase/migrations/20260307_step2_remote_sync_schema.sql`

## OAuth setup reminder

In Supabase Dashboard:
1. Enable Google provider under Auth -> Providers.
2. Add redirect URL(s), including your local and deployed origins.
3. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in app env.

## Optional scheduled pruning

If `pg_cron` is enabled in your Supabase project, you can schedule:
- `public.prune_all_video_watch_logs()` daily.

The SQL file includes a commented example schedule.

## Video log JSON contract

`video_watch_45d_json` is an array of objects:
- `video_id` (string, unique id from your video app)
- `video_name` (string)
- `subject` (`physics` | `chemistry` | `maths`)
- `watched_seconds` (number)
- `watched_date` (`YYYY-MM-DD`)
