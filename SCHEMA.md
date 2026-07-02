# Database Schema Reference

> Auto-reconciled against live Supabase project `immvdbsmzfnbsfuhuknh` on 2026-07-02.
> All column types, constraints, defaults, foreign keys, and indexes reflect the actual live database.

---

## Table `profiles`

### Columns

| Name                  | Type          | Nullable | Default       | Constraints                                              |
| --------------------- | ------------- | -------- | ------------- | -------------------------------------------------------- |
| `id`                  | `uuid`        | NO       | —             | **Primary Key**; FK → `auth.users(id)` ON DELETE CASCADE |
| `display_name`        | `text`        | YES      | —             |                                                          |
| `avatar_seed`         | `text`        | YES      | —             |                                                          |
| `created_at`          | `timestamptz` | NO       | `now()`       |                                                          |
| `updated_at`          | `timestamptz` | NO       | `now()`       |                                                          |
| `username`            | `text`        | YES      | —             | Unique                                                   |
| `avatar_url`          | `text`        | YES      | —             |                                                          |
| `banner_url`          | `text`        | YES      | —             |                                                          |
| `custom_status`       | `text`        | YES      | —             | CHECK `char_length(custom_status) <= 100`                |
| `invite_code`         | `text`        | YES      | —             | Unique; CHECK `invite_code ~ '^[A-Z0-9]{4}$'`            |
| `streak_count`        | `int4`        | NO       | `0`           |                                                          |
| `lifetime_hours`      | `numeric`     | NO       | `0.00`        |                                                          |
| `weekly_hours`        | `numeric`     | NO       | `0.00`        |                                                          |
| `focus_score`         | `int4`        | NO       | `0`           | CHECK `focus_score >= 0 AND focus_score <= 100`          |
| `discord_tag`         | `text`        | YES      | —             |                                                          |
| `grade_status`        | `text`        | YES      | —             |                                                          |
| `target_exam`         | `text`        | YES      | —             |                                                          |
| `today_study_seconds` | `int4`        | YES      | `0`           |                                                          |
| `today_questions`     | `int4`        | YES      | `0`           |                                                          |
| `momentum_heatmap`    | `jsonb`       | YES      | `'[]'::jsonb` |                                                          |
| `todays_tasks`        | `jsonb`       | YES      | `'[]'::jsonb` |                                                          |

### Indexes

- `profiles_pkey` — UNIQUE `(id)`
- `profiles_username_key` — UNIQUE `(username)`
- `profiles_invite_code_key` — UNIQUE `(invite_code)` _(enforced as a real constraint; the former plain B-tree `idx_profiles_invite_code` was dropped in migration 20260702)_

### Triggers

- `ensure_invite_code` — BEFORE INSERT: auto-generates invite code via `set_invite_code()`
- `trg_profiles_updated_at` — BEFORE UPDATE: sets `updated_at = now()` via `set_updated_at()`

---

## Table `subjects`

### Columns

| Name            | Type   | Nullable | Default             | Constraints     |
| --------------- | ------ | -------- | ------------------- | --------------- |
| `id`            | `uuid` | NO       | `gen_random_uuid()` | **Primary Key** |
| `name`          | `text` | NO       | —                   | Unique          |
| `display_order` | `int4` | NO       | —                   |                 |

### Indexes

- `subjects_pkey` — UNIQUE `(id)`
- `subjects_name_key` — UNIQUE `(name)` _(dropped in migration 20260702; table itself dropped — see note below)_

> **Note (2026-07-02):** The `subjects` table was dropped. All syllabus data is served from `public/data/*.json` files; the DB table had 0 scans.

---

## Table `chapters`

### Columns

| Name            | Type   | Nullable | Default             | Constraints                           |
| --------------- | ------ | -------- | ------------------- | ------------------------------------- |
| `id`            | `uuid` | NO       | `gen_random_uuid()` | **Primary Key**                       |
| `subject_id`    | `uuid` | NO       | —                   | FK → `subjects(id)` ON DELETE CASCADE |
| `seed_serial`   | `int4` | NO       | —                   |                                       |
| `name`          | `text` | NO       | —                   |                                       |
| `default_order` | `int4` | NO       | —                   |                                       |

### Indexes

- `chapters_pkey` — UNIQUE `(id)`
- `chapters_subject_id_seed_serial_key` — UNIQUE `(subject_id, seed_serial)`

---

## Table `user_data_blobs`

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
| `total_seconds_biology`   | `int8`        | YES      | `0`           | _(reserved for NEET/biology exam mode)_                |

### Indexes

- `user_study_aggregate_pkey` — UNIQUE `(user_id)`

### Triggers

- `trg_user_study_aggregate_before_upsert` — BEFORE INSERT OR UPDATE: pre-processes analytics JSON via `before_upsert_user_study_aggregate()`

---

> **Note (2026-07-02):** The `sync_prune_audit_log` table was dropped (0 seq_scans, 0 idx_scans; dead weight). Pruning activity is no longer audit-logged at DB level.

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
- `idx_study_session_log_user_id_created_at_id` — `(user_id, created_at, id)`

> **Note:** As of migration `20260702_perf_audit_fixes.sql`, a `UNIQUE (user_id, session_id)` constraint (`unique_user_session`) exists on this table. Duplicate prevention is now enforced at the DB level.

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

### Constraints

- `chk_user_id_ordering` — CHECK `user_id_1 < user_id_2` _(ensures canonical row ordering, prevents duplicate pairs)_

### Indexes

- `peer_relationships_pkey` — UNIQUE `(user_id_1, user_id_2)`
- `idx_peer_relationships_status` — `(status)`
- `idx_peer_relationships_user_id_2` — `(user_id_2)` _(0 scans; candidate for removal)_

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

### Indexes

- `peer_visibility_settings_pkey` — UNIQUE `(user_id)`

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

### Indexes

- `live_activity_pkey` — UNIQUE `(user_id)`
