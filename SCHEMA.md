# Database Schema Reference

> Auto-reconciled against live Supabase project `immvdbsmzfnbsfuhuknh` on 2026-11-26.
> All column types, constraints, defaults, foreign keys, indexes, triggers, and `pg_cron` jobs reflect the actual live database (`supabase/migrations/20261126000000_prod_baseline.sql`).

---

## Table `profiles`

### Columns

| Name                      | Type            | Nullable | Default       | Constraints                                                                   |
| ------------------------- | --------------- | -------- | ------------- | ----------------------------------------------------------------------------- |
| `id`                      | `uuid`          | NO       | —             | **Primary Key**; FK → `auth.users(id)` ON DELETE CASCADE                      |
| `display_name`            | `text`          | YES      | —             |                                                                               |
| `avatar_seed`             | `text`          | YES      | —             |                                                                               |
| `created_at`              | `timestamptz`   | NO       | `now()`       |                                                                               |
| `updated_at`              | `timestamptz`   | NO       | `now()`       |                                                                               |
| `username`                | `text`          | YES      | —             | Unique                                                                        |
| `avatar_url`              | `text`          | YES      | —             | CHECK `avatar_url IS NULL OR avatar_url NOT ILIKE 'data:%'`                   |
| `banner_url`              | `text`          | YES      | —             |                                                                               |
| `custom_status`           | `text`          | YES      | —             | CHECK `char_length(custom_status) <= 100`                                     |
| `invite_code`             | `text`          | YES      | —             | Unique; CHECK `invite_code ~ '^[A-Z0-9]{4}$'`                                 |
| `streak_count`            | `int4`          | NO       | `0`           |                                                                               |
| `lifetime_hours`          | `numeric(10,2)` | NO       | `0.00`        |                                                                               |
| `weekly_hours`            | `numeric(10,2)` | NO       | `0.00`        |                                                                               |
| `focus_score`             | `int4`          | NO       | `0`           | CHECK `focus_score >= 0 AND focus_score <= 100`                               |
| `discord_tag`             | `text`          | YES      | —             |                                                                               |
| `grade_status`            | `text`          | YES      | —             |                                                                               |
| `target_exam`             | `text`          | YES      | —             |                                                                               |
| `today_study_seconds`     | `int4`          | YES      | `0`           |                                                                               |
| `today_questions`         | `int4`          | YES      | `0`           |                                                                               |
| `momentum_heatmap`        | `jsonb`         | YES      | `'[]'::jsonb` |                                                                               |
| `todays_tasks`            | `jsonb`         | YES      | `'[]'::jsonb` |                                                                               |
| `leaderboard_invalidated` | `bool`          | NO       | `false`       |                                                                               |

### Indexes

- `profiles_pkey` — UNIQUE `(id)`
- `profiles_username_key` — UNIQUE `(username)`
- `profiles_invite_code_key` — UNIQUE `(invite_code)`

### Triggers

- `ensure_invite_code` — BEFORE INSERT: auto-generates invite code via `set_invite_code()`
- `trg_profiles_leaderboard_guardrail_insert` — BEFORE INSERT: validates study bounds via `check_leaderboard_invalidation()`
- `trg_profiles_leaderboard_guardrail_update` — BEFORE UPDATE (`WHEN` study/heatmap/question columns change): validates study bounds via `check_leaderboard_invalidation()`
- `trg_profiles_updated_at` — BEFORE UPDATE (`WHEN (old.* IS DISTINCT FROM new.*)`): sets `updated_at = now()` via `set_updated_at()`
- `zz_profiles_suppress_redundant_updates` — BEFORE UPDATE: suppresses no-op row updates via `suppress_redundant_updates_trigger()`

---

## Table `chapters` _(Legacy / Unused)_

> **Note:** `subjects` and `sync_prune_audit_log` were dropped on 2026-07-02. `chapters` remains in `public` with RLS enabled (`Public chapters readable` for `authenticated`), though syllabus data is served from `src/data/syllabus/*.json` and `public/data/*.json`.

### Columns

| Name            | Type   | Nullable | Default             | Constraints     |
| --------------- | ------ | -------- | ------------------- | --------------- |
| `id`            | `uuid` | NO       | `gen_random_uuid()` | **Primary Key** |
| `subject_id`    | `uuid` | NO       | —                   |                 |
| `seed_serial`   | `int4` | NO       | —                   |                 |
| `name`          | `text` | NO       | —                   |                 |
| `default_order` | `int4` | NO       | —                   |                 |

### Indexes

- `chapters_pkey` — UNIQUE `(id)`
- `chapters_subject_id_seed_serial_key` — UNIQUE `(subject_id, seed_serial)`

---

## Table `user_data_blobs` _(Legacy)_

### Columns

| Name               | Type          | Nullable | Default             | Constraints                                   |
| ------------------ | ------------- | -------- | ------------------- | --------------------------------------------- |
| `id`               | `uuid`        | NO       | `gen_random_uuid()` | **Primary Key**                               |
| `user_id`          | `uuid`        | NO       | —                   | Unique; FK → `profiles(id)` ON DELETE CASCADE |
| `compressed_state` | `text`        | NO       | —                   |                                               |
| `created_at`       | `timestamptz` | NO       | `now()`             |                                               |
| `updated_at`       | `timestamptz` | NO       | `now()`             |                                               |

### Indexes

- `user_data_blobs_pkey` — UNIQUE `(id)`
- `user_data_blobs_user_id_key` — UNIQUE `(user_id)`

### Triggers

- `trg_user_data_blobs_updated_at` — BEFORE UPDATE: sets `updated_at = now()` via `set_updated_at()`

---

## Table `user_sync_state`

### Columns

| Name                | Type          | Nullable | Default    | Constraints                                                              |
| ------------------- | ------------- | -------- | ---------- | ------------------------------------------------------------------------ |
| `user_id`           | `uuid`        | NO       | —          | **Primary Key**; FK → `profiles(id)` ON DELETE CASCADE                   |
| `payload_inline`    | `text`        | YES      | —          | CHECK `payload_inline IS NULL OR octet_length(payload_inline) <= 524288` |
| `payload_storage`   | `text`        | NO       | `'inline'` | CHECK `IN ('inline', 'chunked')`                                         |
| `payload_version`   | `int8`        | NO       | `1`        |                                                                          |
| `chunk_count`       | `int4`        | NO       | `0`        | CHECK `chunk_count >= 0`                                                 |
| `payload_bytes`     | `int4`        | NO       | `0`        | CHECK `payload_bytes >= 0`                                               |
| `checksum`          | `text`        | NO       | `''`       |                                                                          |
| `client_updated_at` | `timestamptz` | NO       | `now()`    |                                                                          |
| `app_version`       | `text`        | YES      | —          |                                                                          |
| `updated_at`        | `timestamptz` | NO       | `now()`    |                                                                          |
| `exam_mode`         | `text`        | YES      | `'jee'`    | CHECK `IN ('jee', 'neet')`                                               |

### Indexes

- `user_sync_state_pkey` — UNIQUE `(user_id)`

### Triggers

- `trg_user_sync_state_updated_at` — BEFORE UPDATE: sets `updated_at = now()` via `set_updated_at()`

---

## Table `user_sync_chunks`

### Columns

| Name              | Type          | Nullable | Default | Constraints                                                   |
| ----------------- | ------------- | -------- | ------- | ------------------------------------------------------------- |
| `user_id`         | `uuid`        | NO       | —       | **Primary Key** (part); FK → `profiles(id)` ON DELETE CASCADE |
| `payload_version` | `int8`        | NO       | —       | **Primary Key** (part)                                        |
| `chunk_index`     | `int4`        | NO       | —       | **Primary Key** (part); CHECK `chunk_index >= 0`              |
| `chunk_data`      | `text`        | NO       | —       | CHECK `octet_length(chunk_data) <= 524288`                    |
| `created_at`      | `timestamptz` | NO       | `now()` |                                                               |

### Indexes

- `user_sync_chunks_pkey` — UNIQUE `(user_id, payload_version, chunk_index)`
- `idx_user_sync_chunks_user_version` — `(user_id, payload_version)`

---

## Table `user_study_aggregate`

### Columns

| Name                      | Type          | Nullable | Default       | Constraints                                            |
| ------------------------- | ------------- | -------- | ------------- | ------------------------------------------------------ |
| `user_id`                 | `uuid`        | NO       | —             | **Primary Key**; FK → `profiles(id)` ON DELETE CASCADE |
| `total_seconds_overall`   | `int8`        | NO       | `0`           | CHECK `total_seconds_overall >= 0`                     |
| `total_seconds_physics`   | `int8`        | NO       | `0`           | CHECK `total_seconds_physics >= 0`                     |
| `total_seconds_chemistry` | `int8`        | NO       | `0`           | CHECK `total_seconds_chemistry >= 0`                   |
| `total_seconds_maths`     | `int8`        | NO       | `0`           | CHECK `total_seconds_maths >= 0`                       |
| `buckets_daily_json`      | `jsonb`       | NO       | `'{}'::jsonb` | CHECK `jsonb_typeof(...) = 'object'`                   |
| `buckets_weekly_json`     | `jsonb`       | NO       | `'{}'::jsonb` | CHECK `jsonb_typeof(...) = 'object'`                   |
| `buckets_monthly_json`    | `jsonb`       | NO       | `'{}'::jsonb` | CHECK `jsonb_typeof(...) = 'object'`                   |
| `video_watch_45d_json`    | `jsonb`       | NO       | `'[]'::jsonb` | CHECK `jsonb_typeof(...) = 'array'`                    |
| `updated_at`              | `timestamptz` | NO       | `now()`       |                                                        |
| `total_seconds_biology`   | `int8`        | YES      | `0`           | _(NEET/biology exam mode)_                             |

### Indexes

- `user_study_aggregate_pkey` — UNIQUE `(user_id)`

### Triggers

- `trg_user_study_aggregate_before_upsert` — BEFORE INSERT OR UPDATE: prunes `video_watch_45d_json` and stamps `updated_at` via `before_upsert_user_study_aggregate()`
- `trg_sync_weekly_hours_to_profile_insert` — AFTER INSERT (`WHEN new.buckets_weekly_json IS NOT NULL`): syncs `profiles.weekly_hours` via `sync_weekly_hours_to_profile()`
- `trg_sync_weekly_hours_to_profile_update` — AFTER UPDATE (`WHEN old.buckets_weekly_json IS DISTINCT FROM new.buckets_weekly_json`): syncs `profiles.weekly_hours` via `sync_weekly_hours_to_profile()`

---

## Table `study_session_log`

### Columns

| Name         | Type          | Nullable | Default                  | Constraints                            |
| ------------ | ------------- | -------- | ------------------------ | -------------------------------------- |
| `id`         | `uuid`        | NO       | `gen_random_uuid()`      | **Primary Key**                        |
| `user_id`    | `uuid`        | NO       | —                        | FK → `profiles(id)` ON DELETE CASCADE  |
| `client_id`  | `text`        | NO       | —                        |                                        |
| `session_id` | `text`        | NO       | —                        |                                        |
| `action`     | `text`        | NO       | —                        | CHECK `action IN ('INSERT', 'DELETE')` |
| `payload`    | `jsonb`       | YES      | —                        |                                        |
| `created_at` | `timestamptz` | NO       | `timezone('utc', now())` |                                        |

### Indexes

- `study_session_log_pkey` — UNIQUE `(id)`
- `unique_user_session` — UNIQUE `(user_id, session_id)`
- `idx_study_session_log_user_id_created_at` — `(user_id, created_at)`
- `idx_study_session_log_created_at` — `(created_at)`

---

## Table `entity_change_log`

### Columns

| Name         | Type          | Nullable | Default                  | Constraints                            |
| ------------ | ------------- | -------- | ------------------------ | -------------------------------------- |
| `id`         | `uuid`        | NO       | `gen_random_uuid()`      | **Primary Key**                        |
| `user_id`    | `uuid`        | NO       | —                        | FK → `auth.users(id)` ON DELETE CASCADE |
| `client_id`  | `text`        | NO       | —                        |                                        |
| `domain`     | `text`        | NO       | —                        |                                        |
| `entity_id`  | `text`        | NO       | —                        |                                        |
| `action`     | `text`        | NO       | —                        | CHECK `action IN ('UPSERT', 'DELETE')` |
| `payload`    | `jsonb`       | YES      | —                        |                                        |
| `created_at` | `timestamptz` | NO       | `timezone('utc', now())` |                                        |

### Indexes

- `entity_change_log_pkey` — UNIQUE `(id)`
- `idx_entity_change_log_created_at` — `(created_at)`
- `idx_entity_change_log_user_client` — `(user_id, client_id)`
- `idx_entity_change_log_user_created_at_id` — `(user_id, created_at, id)`
- `idx_entity_change_log_user_domain_time` — `(user_id, domain, created_at)`

---

## Table `peer_relationships`

### Columns

| Name         | Type          | Nullable | Default | Constraints                                                                                                            |
| ------------ | ------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `user_id_1`  | `uuid`        | NO       | —       | **Primary Key** (part); FK → `profiles(id)` ON DELETE CASCADE                                                          |
| `user_id_2`  | `uuid`        | NO       | —       | **Primary Key** (part); FK → `profiles(id)` ON DELETE CASCADE                                                          |
| `status`     | `text`        | NO       | —       | CHECK `status IN ('pending_1_to_2', 'pending_2_to_1', 'accepted', 'blocked_1_by_2', 'blocked_2_by_1', 'blocked_both')` |
| `created_at` | `timestamptz` | NO       | `now()` |                                                                                                                        |
| `updated_at` | `timestamptz` | NO       | `now()` |                                                                                                                        |

### Constraints & Indexes

- `chk_user_id_ordering` — CHECK `user_id_1 < user_id_2`
- `peer_relationships_pkey` — UNIQUE `(user_id_1, user_id_2)`
- `idx_peer_relationships_status` — `(status)`
- `idx_peer_relationships_user_id_2` — `(user_id_2)`

---

## Table `peer_visibility_settings`

### Columns

| Name                    | Type          | Nullable | Default | Constraints                                            |
| ----------------------- | ------------- | -------- | ------- | ------------------------------------------------------ |
| `user_id`               | `uuid`        | NO       | —       | **Primary Key**; FK → `profiles(id)` ON DELETE CASCADE |
| `show_live_activity`    | `bool`        | NO       | `true`  |                                                        |
| `show_weekly_summary`   | `bool`        | NO       | `true`  |                                                        |
| `show_badges`           | `bool`        | NO       | `true`  |                                                        |
| `show_backlog_snapshot` | `bool`        | NO       | `true`  |                                                        |
| `show_completed_tasks`  | `bool`        | NO       | `true`  |                                                        |
| `updated_at`            | `timestamptz` | NO       | `now()` |                                                        |
| `show_agenda`           | `bool`        | YES      | `true`  |                                                        |

### Indexes & RLS

- `peer_visibility_settings_pkey` — UNIQUE `(user_id)`
- RLS: SELECT/INSERT/UPDATE restricted to `(SELECT auth.uid()) = user_id` (`get_visible_peer_ids()` reads via `SECURITY DEFINER`).

---

## Table `live_activity`

### Columns

| Name             | Type          | Nullable | Default | Constraints                                            |
| ---------------- | ------------- | -------- | ------- | ------------------------------------------------------ |
| `user_id`        | `uuid`        | NO       | —       | **Primary Key**; FK → `profiles(id)` ON DELETE CASCADE |
| `is_active`      | `bool`        | NO       | `false` |                                                        |
| `subject`        | `text`        | YES      | —       | CHECK `subject IN ('physics', 'chemistry', 'maths')`   |
| `chapter_name`   | `text`        | YES      | —       |                                                        |
| `chapter_serial` | `int4`        | YES      | —       |                                                        |
| `material`       | `text`        | YES      | —       |                                                        |
| `started_at`     | `timestamptz` | YES      | —       |                                                        |
| `updated_at`     | `timestamptz` | NO       | `now()` |                                                        |

### Indexes & RLS

- `live_activity_pkey` — UNIQUE `(user_id)`
- RLS: `live_activity_select_v2` (`TO authenticated`) allows own row or `user_id IN (SELECT public.get_visible_peer_ids((SELECT auth.uid())))`.

---

## Table `leaderboard_snapshot`

### Columns

| Name           | Type          | Nullable | Default | Constraints                                                |
| -------------- | ------------- | -------- | ------- | ---------------------------------------------------------- |
| `mode`         | `text`        | NO       | —       | **Primary Key** (part); CHECK `IN ('daily', 'weekly', 'monthly')` |
| `rank`         | `int2`        | NO       | —       | **Primary Key** (part); CHECK `rank >= 1 AND rank <= 10`   |
| `user_id`      | `uuid`        | NO       | —       |                                                            |
| `display_name` | `text`        | YES      | —       |                                                            |
| `username`     | `text`        | YES      | —       |                                                            |
| `avatar_url`   | `text`        | YES      | —       |                                                            |
| `hours`        | `numeric`     | NO       | `0`     |                                                            |
| `snapshot_at`  | `timestamptz` | NO       | `now()` |                                                            |

### Indexes

- `leaderboard_snapshot_pkey` — UNIQUE `(mode, rank)`

---

## Tables `groups` & `group_members`

### `groups`

| Name            | Type          | Nullable | Default             | Constraints                                                   |
| --------------- | ------------- | -------- | ------------------- | ------------------------------------------------------------- |
| `id`            | `uuid`        | NO       | `gen_random_uuid()` | **Primary Key**                                               |
| `name`          | `text`        | NO       | —                   | CHECK `char_length(name) <= 50`                               |
| `description`   | `text`        | YES      | —                   | CHECK `char_length(description) <= 250`                       |
| `invite_code`   | `text`        | NO       | —                   | Unique; CHECK `invite_code ~ '^[A-Z0-9]{4}$'`                 |
| `avatar_seed`   | `text`        | YES      | `'group-default'`   |                                                               |
| `avatar_url`    | `text`        | YES      | —                   |                                                               |
| `banner_preset` | `text`        | YES      | `'physics-glass'`   | CHECK `IN ('physics-glass', 'chemistry-glass', 'maths-glass', 'dark-glass', 'gradient-neon')` |
| `banner_url`    | `text`        | YES      | —                   |                                                               |
| `created_by`    | `uuid`        | YES      | —                   | FK → `profiles(id)` ON DELETE CASCADE                         |
| `created_at`    | `timestamptz` | YES      | `now()`             |                                                               |
| `updated_at`    | `timestamptz` | YES      | `now()`             |                                                               |

- Indexes: `groups_pkey`, `groups_invite_code_key`, `idx_groups_created_by`
- Trigger: `trg_groups_updated_at` — BEFORE UPDATE via `set_updated_at()`

### `group_members`

| Name        | Type          | Nullable | Default    | Constraints                                                   |
| ----------- | ------------- | -------- | ---------- | ------------------------------------------------------------- |
| `group_id`  | `uuid`        | NO       | —          | **Primary Key** (part); FK → `groups(id)` ON DELETE CASCADE   |
| `user_id`   | `uuid`        | NO       | —          | **Primary Key** (part); FK → `profiles(id)` ON DELETE CASCADE |
| `role`      | `text`        | YES      | `'member'` | CHECK `role IN ('owner', 'admin', 'member')`                  |
| `joined_at` | `timestamptz` | YES      | `now()`    |                                                               |

- Indexes: `group_members_pkey`, `idx_group_members_user_id`

---

## Storage Buckets & `pg_cron` Schedules

- **Storage Buckets**:
  - `avatars` (`public = true`, `file_size_limit = 2097152`, MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`)
  - `branding` (`public = true`)
- **`pg_cron` Jobs**:
  - `refresh-leaderboard-snapshot` (`5,35 * * * *`) → `public.refresh_leaderboard_snapshot()`
  - `prune-stale-session-logs` (`10 2 * * *`) → `public.cron_prune_stale_session_logs()` (batched 2,000 rows, >45d)
  - `prune-orphaned-chunks` (`20 2 * * *`) → `public.cron_prune_orphaned_chunks()`
  - `cron_prune_stale_entity_logs` (`30 2 * * *`) → `public.cron_prune_stale_entity_logs()` (batched 2,000 rows, >45d)
  - `prune-cron-job-run-details` (`40 2 * * *`) → `public.cron_prune_job_run_details()` (batched 2,000 rows, >7d)
  - `prune-revoked-refresh-tokens` (`50 2 * * *`) → `public.cron_prune_revoked_refresh_tokens()` (batched 2,000 rows, revoked >14d)
