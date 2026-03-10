-- Migration: Create study_session_log table for delta-syncing study sessions
-- This table allows devices to sync discrete session mutations instead of sending massive JSON arrays.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.study_session_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id text NOT NULL,
    session_id text NOT NULL,
    action text NOT NULL CHECK (action IN ('INSERT', 'DELETE')),
    payload jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add an index for quick delta queries based on created_at
CREATE INDEX IF NOT EXISTS study_session_log_user_id_created_at_idx ON public.study_session_log (user_id, created_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.study_session_log ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Users can only read their own logs
CREATE POLICY "Users can view own study session logs"
    ON public.study_session_log FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own logs
CREATE POLICY "Users can insert own study session logs"
    ON public.study_session_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Prevent updates and deletes to strictly enforce an append-only event stream
CREATE POLICY "Users cannot update study session logs"
    ON public.study_session_log FOR UPDATE
    USING (false);

CREATE POLICY "Users cannot delete study session logs"
    ON public.study_session_log FOR DELETE
    USING (false);
