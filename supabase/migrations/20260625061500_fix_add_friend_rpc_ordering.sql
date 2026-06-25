CREATE OR REPLACE FUNCTION public.add_friend_by_code(friend_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_friend_id uuid;
  v_user_id uuid := auth.uid();
  v_id_1 uuid;
  v_id_2 uuid;
BEGIN
  -- Validate user is logged in
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the friend by code
  SELECT id INTO v_friend_id FROM public.profiles WHERE invite_code = upper(friend_code);
  
  IF v_friend_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  
  IF v_friend_id = v_user_id THEN
    RAISE EXCEPTION 'You cannot add yourself';
  END IF;

  -- Sort IDs to satisfy chk_user_id_ordering (user_id_1 < user_id_2)
  IF v_user_id < v_friend_id THEN
    v_id_1 := v_user_id;
    v_id_2 := v_friend_id;
  ELSE
    v_id_1 := v_friend_id;
    v_id_2 := v_user_id;
  END IF;

  -- Insert single directional relationship matching the constraint
  INSERT INTO public.peer_relationships (user_id_1, user_id_2, status, created_at, updated_at)
  VALUES (v_id_1, v_id_2, 'accepted', now(), now())
  ON CONFLICT (user_id_1, user_id_2) DO UPDATE SET status = 'accepted', updated_at = now();

  RETURN true;
END;
$$;
