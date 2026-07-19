-- =============================================================================
-- Migration: 20260719_add_neet_columns.sql
-- Reconcile local migrations with the live schema (NEET support).
--
-- The live DB already carries these columns via an earlier "add_neet_support"
-- migration that was never committed to supabase/migrations/. This file makes
-- `supabase db reset` reproduce the live schema. All changes are idempotent
-- (ADD COLUMN IF NOT EXISTS), so applying against the live DB is a no-op.
-- =============================================================================

BEGIN;

-- user_sync_state.exam_mode — active exam preset for the account ('jee' | 'neet')
ALTER TABLE public.user_sync_state
  ADD COLUMN IF NOT EXISTS exam_mode text DEFAULT 'jee';

-- user_study_aggregate.total_seconds_biology — NEET-mode Biology study total
ALTER TABLE public.user_study_aggregate
  ADD COLUMN IF NOT EXISTS total_seconds_biology bigint DEFAULT 0;

COMMIT;
