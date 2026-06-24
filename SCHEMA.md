## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `display_name` | `text` |  Nullable |
| `avatar_seed` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `username` | `text` |  Nullable Unique |
| `avatar_url` | `text` |  Nullable |
| `banner_url` | `text` |  Nullable |
| `custom_status` | `text` |  Nullable |
| `invite_code` | `text` |  Nullable Unique |
| `streak_count` | `int4` |  |
| `lifetime_hours` | `numeric` |  |
| `weekly_hours` | `numeric` |  |
| `focus_score` | `int4` |  |

## Table `subjects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `display_order` | `int4` |  |

## Table `chapters`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `subject_id` | `uuid` |  |
| `seed_serial` | `int4` |  |
| `name` | `text` |  |
| `default_order` | `int4` |  |

## Table `user_data_blobs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `compressed_state` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `user_sync_state`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `payload_inline` | `text` |  Nullable |
| `payload_storage` | `text` |  |
| `payload_version` | `int8` |  |
| `chunk_count` | `int4` |  |
| `payload_bytes` | `int4` |  |
| `checksum` | `text` |  |
| `client_updated_at` | `timestamptz` |  |
| `app_version` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  |
| `exam_mode` | `text` |  Nullable |

## Table `user_sync_chunks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `payload_version` | `int8` | Primary |
| `chunk_index` | `int4` | Primary |
| `chunk_data` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `user_study_aggregate`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `total_seconds_overall` | `int8` |  |
| `total_seconds_physics` | `int8` |  |
| `total_seconds_chemistry` | `int8` |  |
| `total_seconds_maths` | `int8` |  |
| `buckets_daily_json` | `jsonb` |  |
| `buckets_weekly_json` | `jsonb` |  |
| `buckets_monthly_json` | `jsonb` |  |
| `video_watch_45d_json` | `jsonb` |  |
| `updated_at` | `timestamptz` |  |
| `total_seconds_biology` | `int8` |  Nullable |

## Table `sync_prune_audit_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `called_by` | `uuid` |  |
| `target_user_id` | `uuid` |  |
| `keep_version` | `int8` |  |
| `rows_deleted` | `int4` |  |
| `pruned_at` | `timestamptz` |  |

## Table `study_session_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `client_id` | `text` |  |
| `session_id` | `text` |  |
| `action` | `text` |  |
| `payload` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `peer_relationships`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id_1` | `uuid` | Primary |
| `user_id_2` | `uuid` | Primary |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `peer_visibility_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `show_live_activity` | `bool` |  |
| `show_weekly_summary` | `bool` |  |
| `show_badges` | `bool` |  |
| `show_backlog_snapshot` | `bool` |  |
| `show_completed_tasks` | `bool` |  |
| `updated_at` | `timestamptz` |  |

## Table `live_activity`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `is_active` | `bool` |  |
| `subject` | `text` |  Nullable |
| `chapter_name` | `text` |  Nullable |
| `chapter_serial` | `int4` |  Nullable |
| `material` | `text` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  |

