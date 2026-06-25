-- Create RPC function to disconnect a peer
CREATE OR REPLACE FUNCTION public.disconnect_peer(friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id_1 uuid;
  v_id_2 uuid;
BEGIN
  -- Validate user is logged in
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Order the IDs to match constraint chk_user_id_ordering (user_id_1 < user_id_2)
  IF v_user_id < friend_id THEN
    v_id_1 := v_user_id;
    v_id_2 := friend_id;
  ELSE
    v_id_1 := friend_id;
    v_id_2 := v_user_id;
  END IF;

  -- Delete the peer relationship row
  DELETE FROM public.peer_relationships
  WHERE user_id_1 = v_id_1 AND user_id_2 = v_id_2;

  RETURN true;
END;
$$;

-- Allow delete on peer_relationships for the users involved
DROP POLICY IF EXISTS "peer_relationships_delete_policy" ON public.peer_relationships;
CREATE POLICY "peer_relationships_delete_policy" ON public.peer_relationships 
  FOR DELETE 
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
