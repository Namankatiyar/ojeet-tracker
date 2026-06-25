-- Fix RLS policies for live_activity and peer_visibility_settings

-- Enable RLS
ALTER TABLE public.live_activity ENABLE ROW LEVEL SECURITY;

-- Drop any potentially conflicting generic policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.live_activity;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.live_activity;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.live_activity;
DROP POLICY IF EXISTS "live_activity_select_policy" ON public.live_activity;
DROP POLICY IF EXISTS "live_activity_insert_policy" ON public.live_activity;
DROP POLICY IF EXISTS "live_activity_update_policy" ON public.live_activity;

-- Create correct policies
CREATE POLICY "live_activity_select_policy" ON public.live_activity FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "live_activity_insert_policy" ON public.live_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "live_activity_update_policy" ON public.live_activity FOR UPDATE USING (auth.uid() = user_id);


-- Peer Visibility Settings RLS
ALTER TABLE public.peer_visibility_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.peer_visibility_settings;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.peer_visibility_settings;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.peer_visibility_settings;
DROP POLICY IF EXISTS "peer_visibility_select_policy" ON public.peer_visibility_settings;
DROP POLICY IF EXISTS "peer_visibility_insert_policy" ON public.peer_visibility_settings;
DROP POLICY IF EXISTS "peer_visibility_update_policy" ON public.peer_visibility_settings;

CREATE POLICY "peer_visibility_select_policy" ON public.peer_visibility_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "peer_visibility_insert_policy" ON public.peer_visibility_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "peer_visibility_update_policy" ON public.peer_visibility_settings FOR UPDATE USING (auth.uid() = user_id);

-- Peer Relationships RLS (Reads)
ALTER TABLE public.peer_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "peer_relationships_select_policy" ON public.peer_relationships;

-- Users can read relationships where they are user_id_1 (their friend list) or user_id_2 (who added them)
CREATE POLICY "peer_relationships_select_policy" ON public.peer_relationships FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

