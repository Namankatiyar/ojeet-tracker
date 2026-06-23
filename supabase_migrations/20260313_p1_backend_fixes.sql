-- Migration: P1 Backend Fixes (Security and Performance)
-- Generated to resolve issues identified in BACKEND.md audit

BEGIN;

-- 1. Fix N+1 performance issue in RLS policies for `profiles` and `live_activity`
-- We are removing the slow `are_users_peers()` function from SELECT policies
-- and replacing them with basic authenticated user visibility. 
-- The client UI is responsible for filtering out non-peers as per user decision.

DO $$
DECLARE
    pol record;
BEGIN
    -- Drop all SELECT policies on `profiles`
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;

    -- Drop all SELECT policies on `live_activity`
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'live_activity' 
          AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.live_activity', pol.policyname);
    END LOOP;
END
$$;

-- Create lightweight generic SELECT policies allowing authenticated access
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view live_activity"
  ON public.live_activity FOR SELECT
  TO authenticated
  USING (true);


-- 2. Prevent duplicate session logs
-- Deduplicate existing rows before adding constraint (keep oldest row)
DELETE FROM public.study_session_log
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, session_id ORDER BY created_at ASC) as rnum
    FROM public.study_session_log
  ) t
  WHERE t.rnum > 1
);

-- Add UNIQUE constraint to prevent retried requests from creating duplicates
ALTER TABLE public.study_session_log 
  DROP CONSTRAINT IF EXISTS unique_user_session,
  ADD CONSTRAINT unique_user_session UNIQUE (user_id, session_id);


-- 3. Prevent spoofed analytical payloads
-- Add CHECK constraint for duration limit (max 86400 seconds = 24 hours)
ALTER TABLE public.study_session_log
  DROP CONSTRAINT IF EXISTS check_payload_duration;

ALTER TABLE public.study_session_log
  ADD CONSTRAINT check_payload_duration 
  CHECK (
    (payload->>'duration') IS NULL OR 
    (payload->>'duration')::numeric <= 86400
  );

COMMIT;
