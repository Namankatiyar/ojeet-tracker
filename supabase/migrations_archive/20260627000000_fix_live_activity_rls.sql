-- Fix broken live_activity RLS policy which caused querying peers' live_activity to fail

-- 1. Drop the slow, broken policy
DROP POLICY IF EXISTS "live_activity_select_optimized" ON public.live_activity;

-- 2. Create a fast policy that checks 'show_agenda' without using the slow 'are_users_peers' function
CREATE POLICY "live_activity_select_optimized" ON public.live_activity
FOR SELECT USING (
  (SELECT auth.uid()) = user_id OR
  (
    (SELECT show_agenda FROM public.peer_visibility_settings WHERE user_id = public.live_activity.user_id LIMIT 1) IS NOT FALSE
  )
);
