-- Add snapshot columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_tag text,
  ADD COLUMN IF NOT EXISTS grade_status text,
  ADD COLUMN IF NOT EXISTS target_exam text,
  ADD COLUMN IF NOT EXISTS today_study_seconds int4 DEFAULT 0,
  ADD COLUMN IF NOT EXISTS today_questions int4 DEFAULT 0,
  ADD COLUMN IF NOT EXISTS momentum_heatmap jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS todays_tasks jsonb DEFAULT '[]'::jsonb;

-- Add privacy settings to peer_visibility_settings
ALTER TABLE public.peer_visibility_settings
  ADD COLUMN IF NOT EXISTS show_agenda bool DEFAULT true;

-- Function to generate a 4-character invite code
CREATE OR REPLACE FUNCTION public.set_invite_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  is_unique boolean;
BEGIN
  IF NEW.invite_code IS NULL THEN
    LOOP
      new_code := upper(substring(md5(random()::text) from 1 for 4));
      
      -- Check uniqueness
      SELECT NOT EXISTS(
        SELECT 1 FROM public.profiles WHERE invite_code = new_code
      ) INTO is_unique;
      
      IF is_unique THEN
        NEW.invite_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to ensure invite_code is generated before insert
DROP TRIGGER IF EXISTS ensure_invite_code ON public.profiles;
CREATE TRIGGER ensure_invite_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invite_code();

-- Backfill existing profiles with an invite code
DO $$
DECLARE
  v_rec record;
  new_code text;
  is_unique boolean;
BEGIN
  FOR v_rec IN SELECT id FROM public.profiles WHERE invite_code IS NULL LOOP
    LOOP
      new_code := upper(substring(md5(random()::text) from 1 for 4));
      SELECT NOT EXISTS(
        SELECT 1 FROM public.profiles WHERE invite_code = new_code
      ) INTO is_unique;
      
      IF is_unique THEN
        UPDATE public.profiles SET invite_code = new_code WHERE id = v_rec.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- RPC to add friend via code and create bidirectional relationship
CREATE OR REPLACE FUNCTION public.add_friend_by_code(friend_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_friend_id uuid;
  v_user_id uuid := auth.uid();
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

  -- Insert bidirectional relationships
  INSERT INTO public.peer_relationships (user_id_1, user_id_2, status, created_at, updated_at)
  VALUES (v_user_id, v_friend_id, 'accepted', now(), now())
  ON CONFLICT (user_id_1, user_id_2) DO UPDATE SET status = 'accepted', updated_at = now();

  INSERT INTO public.peer_relationships (user_id_1, user_id_2, status, created_at, updated_at)
  VALUES (v_friend_id, v_user_id, 'accepted', now(), now())
  ON CONFLICT (user_id_1, user_id_2) DO UPDATE SET status = 'accepted', updated_at = now();

  RETURN true;
END;
$$;
