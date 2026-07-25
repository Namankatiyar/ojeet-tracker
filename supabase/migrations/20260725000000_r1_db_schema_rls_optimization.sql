-- =============================================================================
-- Migration: 20260725000000_r1_db_schema_rls_optimization.sql
-- R1 Focus: Database Schema & RLS Policy Optimization
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 1: Refactor `live_activity` RLS Select Policy
-- Eliminates 2N correlated subquery overhead during 30s polling ticks.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_visible_peer_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT CASE 
    WHEN pr.user_id_1 = p_user_id THEN pr.user_id_2 
    ELSE pr.user_id_1 
  END
  FROM public.peer_relationships pr
  LEFT JOIN public.peer_visibility_settings pvs 
    ON pvs.user_id = (CASE WHEN pr.user_id_1 = p_user_id THEN pr.user_id_2 ELSE pr.user_id_1 END)
  WHERE pr.status = 'accepted'
    AND (pr.user_id_1 = p_user_id OR pr.user_id_2 = p_user_id)
    AND pvs.show_agenda IS NOT FALSE;
$$;

DROP POLICY IF EXISTS "live_activity_select_v2" ON public.live_activity;
DROP POLICY IF EXISTS "live_activity_select_v3" ON public.live_activity;

CREATE POLICY "live_activity_select_v2" ON public.live_activity
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id OR (user_id IN (SELECT public.get_visible_peer_ids(auth.uid())))
  );


-- ---------------------------------------------------------------------------
-- SECTION 2: Clean `profiles.avatar_url` & Enforce Base64 CHECK Constraint
-- Prevents ~250 KB base64 URIs from corrupting profiles and snapshots.
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url ILIKE 'data:%';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_avatar_url_no_base64;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_avatar_url_no_base64
  CHECK (avatar_url IS NULL OR avatar_url NOT ILIKE 'data:%');


-- ---------------------------------------------------------------------------
-- SECTION 3: Create `avatars` Storage Bucket & Object RLS Policies
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  2097152, -- 2 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users Upload Own Avatar" ON storage.objects;
CREATE POLICY "Users Upload Own Avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users Update Own Avatar" ON storage.objects;
CREATE POLICY "Users Update Own Avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users Delete Own Avatar" ON storage.objects;
CREATE POLICY "Users Delete Own Avatar" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ---------------------------------------------------------------------------
-- SECTION 4: Add Composite & Retention Indexes on Log Tables
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_study_session_log_created_at 
  ON public.study_session_log (created_at);

CREATE INDEX IF NOT EXISTS idx_entity_change_log_user_created_at_id 
  ON public.entity_change_log (user_id, created_at, id);

CREATE INDEX IF NOT EXISTS idx_entity_change_log_created_at 
  ON public.entity_change_log (created_at);

CREATE INDEX IF NOT EXISTS idx_user_sync_chunks_created_at 
  ON public.user_sync_chunks (created_at);

COMMIT;
