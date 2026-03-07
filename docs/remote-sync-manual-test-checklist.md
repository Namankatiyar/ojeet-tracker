# Remote Sync Manual Test Checklist

## Setup
1. Sign in with Google on Device A and Device B using the same account.
2. Keep Settings open on both to observe sync status and last synced timestamp.

## Core sync
1. On Device A, create one planner task and wait 30-40s.
2. On Device B, bring app to foreground.
3. Confirm task appears after focus-triggered sync.

## Conflict policy (cloud-first + local unsynced override per-domain)
1. On Device A, edit Planner only.
2. On Device B, edit Exam dates only.
3. Trigger sync on both (`Sync Now` once each).
4. Verify final state includes both edits (planner from A, exams from B).

## Optional auth behavior
1. Sign out from Settings on Device A.
2. Confirm local app still works.
3. Confirm remote-sync metadata cache is cleared locally.

## Aggregate + video integration
1. In external video app, push a video watch entry for today (`video_id`, subject, watched_seconds, watched_date).
2. In OJEE Tracker, trigger `Sync Now`.
3. Verify:
   - “Video logs synced from cloud app” count increases.
   - Dashboard total studied increases accordingly.
   - Weekly/monthly study charts reflect additional time.

## Retry/backoff
1. Simulate network failure.
2. Trigger `Sync Now`.
3. Confirm status becomes `error`.
4. Restore network and bring app to foreground.
5. Confirm sync eventually succeeds and status changes to `synced`.

## Planner history window
1. Add tasks older than 60 days in local data.
2. Sync and inspect cloud payload/state.
3. Confirm only last 60 days + future planner tasks are sent.

## Chunking behavior
1. Inflate local payload (e.g., many planner tasks/records) to exceed 512KB compressed.
2. Sync and verify `user_sync_state.payload_storage = 'chunked'`.
3. Confirm `user_sync_chunks` rows exist with expected `chunk_count`.
4. Confirm data reconstructs correctly on another device.
