-- Migration: Add get_profile_by_invite_code RPC
-- Creates a SECURITY DEFINER function to fetch non-sensitive profile info by invite code.

CREATE OR REPLACE FUNCTION public.get_profile_by_invite_code(friend_code text)
RETURNS TABLE (
  display_name text,
  avatar_url text,
  invite_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.display_name, p.avatar_url, p.invite_code
  FROM public.profiles p
  WHERE p.invite_code = upper(friend_code)
  LIMIT 1;
END;
$$;
