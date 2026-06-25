-- Migration: Add banner_url to get_profile_by_invite_code RPC
-- Drops and recreates the function to change the return table structure.

DROP FUNCTION IF EXISTS public.get_profile_by_invite_code(text);

CREATE OR REPLACE FUNCTION public.get_profile_by_invite_code(friend_code text)
RETURNS TABLE (
  display_name text,
  avatar_url text,
  invite_code text,
  banner_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.display_name, p.avatar_url, p.invite_code, p.banner_url
  FROM public.profiles p
  WHERE p.invite_code = upper(friend_code)
  LIMIT 1;
END;
$$;
