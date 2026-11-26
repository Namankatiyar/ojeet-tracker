# Backend Architecture

> Reconciled against live Supabase project `immvdbsmzfnbsfuhuknh` and codebase on 2026-11-26.

## 1. Executive Summary

- **Backend Stack:** React/Vite SPA communicating with Supabase (PostgreSQL, Auth, Storage, Edge Functions) via `@supabase/supabase-js` (`@supabase/supabase-js@2.98.0`), plus Vercel serverless/edge functions under `api/`.
- **Data Persistence:** Offline-first architecture. Application state is persisted in `localStorage` and synchronized to Supabase as compressed JSON blobs/chunks (`user_sync_state`, `user_sync_chunks`) alongside append-only session logs (`study_session_log`) and pre-aggregated stats (`user_study_aggregate`).
- **Authentication:** Handled via Supabase Auth (Google OAuth and email/password).
- **Maintenance & Aggregation:** `pg_cron` jobs handle leaderboard snapshot refreshes (`refresh_leaderboard_snapshot`) and batched retention pruning (`study_session_log`, `entity_change_log`, `user_sync_chunks`, `cron.job_run_details`, `auth.refresh_tokens`).

## 2. Backend Surface Map

| Area | Files / Locations | Responsibility |
|---|---|---|
| **Supabase Client** | `src/shared/lib/supabase.ts` | Initializes `supabase` client with `createTimeoutFetch(20_000)` and custom auth lock. |
| **Authentication Flow** | `src/core/context/RemoteAuthContext.tsx` | Manages session state, OAuth/email auth, password recovery, and sign-out cleanup. |
| **Data Sync Layer** | `src/core/context/RemoteSyncContext.tsx` | Orchestrates offline-first push/pull sync of `user_sync_state`, `user_sync_chunks`, `study_session_log`, and `user_study_aggregate`. |
| **Community & Peers** | `src/features/community/hooks/useProfileSync.ts`, `useFriends.ts`, `useActivityHeartbeat.ts`, `Leaderboard.tsx`, `InviteHandler.tsx`, `ProfileEditModal.tsx` | Syncs profile snapshots/visibility, polls `live_activity` & `profiles`, uploads avatars, handles invites and leaderboards. |
| **Account Deletion** | `src/shared/components/ui/SettingsModal.tsx`, `supabase/functions/delete-user-account/index.ts` | Invokes `delete-user-account` Edge Function to delete `auth.users` identity (cascading deletes). |
| **Vercel Functions** | `api/invite-page.js`, `api/invite-image.js`, `api/create-order.js`, `api/verify-payment.js`, `api/edge-meta.js`, `api/subject-prerender.js` | Invite OG meta/PNG generation (via `get_profile_by_invite_code`), Razorpay donation endpoints, and SEO prerendering. |

## 3. Supabase Project Overview

- **Project / Database:** `immvdbsmzfnbsfuhuknh` (`OJEET-Tools`, Postgres 17)
- **Auth Configuration:** `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`.
- **Storage Buckets:** `avatars` (public read, 2 MB limit, own-folder write/update/delete) and `branding` (public read).
- **Environment Variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client); `SUPABASE_SERVICE_ROLE_KEY` (Vercel `api/invite-page.js` / Edge Function).

## 4. Database Schema

> Full column, constraint, index, and trigger reference lives in [SCHEMA.md](./SCHEMA.md) and [supabase/migrations/20261126000000_prod_baseline.sql](./supabase/migrations/20261126000000_prod_baseline.sql).

- **`profiles`**: User profiles, invite codes, study snapshot metrics (`today_study_seconds`, `today_questions`, `momentum_heatmap`, `todays_tasks`, `streak_count`, `weekly_hours`, `leaderboard_invalidated`). Readable by `authenticated`; self-writable.
- **`user_sync_state`**: Per-user compressed sync manifest (`payload_inline` up to 512 KB, `payload_storage`, `payload_version`, `checksum`, `exam_mode`). Strict own-row RLS (`(SELECT auth.uid()) = user_id`).
- **`user_sync_chunks`**: Chunked payloads when compressed state exceeds 512 KB. Strict own-row RLS.
- **`user_study_aggregate`**: Rolled-up totals (`overall`, `physics`, `chemistry`, `maths`, `biology`) and JSONB buckets (`daily`, `weekly`, `monthly`, `video_watch_45d_json`). Triggers sync `profiles.weekly_hours` when `buckets_weekly_json` changes.
- **`study_session_log`**: Append-only study session delta log with `UNIQUE (user_id, session_id)` (`unique_user_session`). Updates/deletes blocked by RLS.
- **`entity_change_log`**: Delta log table for entity-level changes (`domain`, `entity_id`, `action`). Strict own-row SELECT/INSERT RLS.
- **`peer_relationships`**, **`peer_visibility_settings`**, **`live_activity`**: Peer connections (`user_id_1 < user_id_2`), visibility preferences (own-row RLS; read for peers inside `SECURITY DEFINER` `get_visible_peer_ids`), and live study status (`live_activity_select_v2` via `get_visible_peer_ids`).
- **`leaderboard_snapshot`**: Materialized top-10 rankings for `daily`, `weekly`, and `monthly` modes (refreshed by `pg_cron` at `:05` and `:35`, skipping writes when unchanged).
- **`groups`** & **`group_members`**: Study groups and memberships, managed via RPCs (`create_group`, `join_group_by_code`, `get_my_groups`, `kick_group_member`, `leave_group`, `update_group_profile`).
- **Legacy tables**: `user_data_blobs`, `chapters`.

## 5. Authentication and Authorization Model

- **Auth Providers:** Google OAuth (`signInWithOAuth`), email/password (`signUp`, `signInWithPassword`), email verification resend, and password recovery (`resetPasswordForEmail` + `PASSWORD_RECOVERY` event).
- **Redirect URL Resolution:** Dynamic `window.location.origin` with fallback to `https://tracker.ojeet.tech`.
- **Profile Provisioning:** Database trigger `on_auth_user_created` (`handle_new_user_profile()`) creates `profiles`, `peer_visibility_settings`, and `live_activity` rows on signup; `useProfileSync` backfills/syncs profile metadata and study snapshots.
- **RLS Enforcement:** Enabled on all `public` tables and `storage.objects`, using `(SELECT auth.uid())` initplan-optimized policies.

## 6. Data Flow by Feature

### Progress Syncing (Offline-First)

```text
User interacts locally -> localStorage updates
-> RemoteSyncContext (mount, 10m/30m poll, visibilitychange)
-> GET user_sync_state (checksum probe) -> full payload/chunks if changed
-> GET study_session_log (delta pull) & conditional GET user_study_aggregate
-> Merge domains -> upsert user_sync_state (+ user_sync_chunks if >512 KB)
-> Insert pending study_session_log deltas
```

### Community, Profile Snapshots & Leaderboards

- `ProfileSyncManager` (`src/core/App.tsx`) mounts `useProfileSync` globally to upsert `profiles` and `peer_visibility_settings` on a 5s debounce.
- `CommunityPage` mounts `useActivityHeartbeat` (upserts `live_activity`) and `useFriends` (fetches `peer_relationships`, `profiles`, `live_activity`, and polls `live_activity` every 30s).
- `Leaderboard` reads `leaderboard_snapshot` by mode (`daily`, `weekly`, `monthly`).

## 7. Database Functions, Triggers, RPCs, and Scheduled Jobs

### Active Triggers

| Trigger Name | Table | Event | Function Called |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user_profile()` |
| `ensure_invite_code` | `public.profiles` | BEFORE INSERT | `set_invite_code()` |
| `trg_profiles_leaderboard_guardrail_insert` | `public.profiles` | BEFORE INSERT | `check_leaderboard_invalidation()` |
| `trg_profiles_leaderboard_guardrail_update` | `public.profiles` | BEFORE UPDATE (`WHEN` score/heatmap cols change) | `check_leaderboard_invalidation()` |
| `trg_profiles_updated_at` | `public.profiles` | BEFORE UPDATE (`WHEN old.* IS DISTINCT FROM new.*`) | `set_updated_at()` |
| `zz_profiles_suppress_redundant_updates` | `public.profiles` | BEFORE UPDATE | `suppress_redundant_updates_trigger()` |
| `trg_groups_updated_at` | `public.groups` | BEFORE UPDATE | `set_updated_at()` |
| `trg_user_data_blobs_updated_at` | `public.user_data_blobs` | BEFORE UPDATE | `set_updated_at()` |
| `trg_user_sync_state_updated_at` | `public.user_sync_state` | BEFORE UPDATE | `set_updated_at()` |
| `trg_user_study_aggregate_before_upsert` | `public.user_study_aggregate` | BEFORE INSERT OR UPDATE | `before_upsert_user_study_aggregate()` |
| `trg_sync_weekly_hours_to_profile_insert` | `public.user_study_aggregate` | AFTER INSERT | `sync_weekly_hours_to_profile()` |
| `trg_sync_weekly_hours_to_profile_update` | `public.user_study_aggregate` | AFTER UPDATE (`WHEN buckets_weekly_json` changes) | `sync_weekly_hours_to_profile()` |

### `pg_cron` Scheduled Jobs

| Job Name | Schedule | Function |
|---|---|---|
| `refresh-leaderboard-snapshot` | `5,35 * * * *` | `public.refresh_leaderboard_snapshot()` |
| `prune-stale-session-logs` | `10 2 * * *` | `public.cron_prune_stale_session_logs()` |
| `prune-orphaned-chunks` | `20 2 * * *` | `public.cron_prune_orphaned_chunks()` |
| `cron_prune_stale_entity_logs` | `30 2 * * *` | `public.cron_prune_stale_entity_logs()` |
| `prune-cron-job-run-details` | `40 2 * * *` | `public.cron_prune_job_run_details()` |
| `prune-revoked-refresh-tokens` | `50 2 * * *` | `public.cron_prune_revoked_refresh_tokens()` |

### Key RPCs

- **Peers & Invites:** `add_friend_by_code`, `disconnect_peer`, `get_profile_by_invite_code`, `get_visible_peer_ids`, `send_peer_request_by_invite_code`, `respond_to_peer_request`, `remove_peer`, `are_users_peers`.
- **Groups:** `create_group`, `get_my_groups`, `join_group_by_code`, `kick_group_member`, `leave_group`, `update_group_profile`, `generate_group_invite_code`.
- **External Analytics:** `merge_video_logs(new_logs jsonb)` (invoked by an external application; no call site in this frontend codebase).

## 8. Appendix: Backend Inventory

- **Vercel Functions (`api/`):** `invite-page.js`, `invite-image.js`, `create-order.js`, `verify-payment.js`, `edge-meta.js`, `subject-prerender.js`
- **Supabase Edge Functions:** `supabase/functions/delete-user-account/index.ts`
- **Supabase Client:** `src/shared/lib/supabase.ts`
- **Core Tables:** `profiles`, `user_sync_state`, `user_sync_chunks`, `user_study_aggregate`, `study_session_log`, `entity_change_log`, `peer_relationships`, `peer_visibility_settings`, `live_activity`, `leaderboard_snapshot`, `groups`, `group_members`, `user_data_blobs`, `chapters`
- **Migrations Baseline:** `supabase/migrations/20261126000000_prod_baseline.sql` (historical files archived in `supabase/migrations_archive/`)
