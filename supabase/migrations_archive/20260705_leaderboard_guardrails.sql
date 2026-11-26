-- Migration: add leaderboard guardrails and automatic invalidation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leaderboard_invalidated BOOLEAN NOT NULL DEFAULT FALSE;

-- Create function to check profiles updates dynamically
CREATE OR REPLACE FUNCTION public.check_leaderboard_invalidation()
RETURNS TRIGGER AS $$
DECLARE
  heatmap_item JSONB;
  has_anomaly BOOLEAN := FALSE;
BEGIN
  -- 1. Check today_study_seconds (must not exceed 18 hours = 64800 seconds)
  IF NEW.today_study_seconds > 64800 THEN
    has_anomaly := TRUE;
  END IF;

  -- 2. Check momentum_heatmap array items (each representing a day's study seconds)
  IF NOT has_anomaly AND NEW.momentum_heatmap IS NOT NULL AND jsonb_typeof(NEW.momentum_heatmap) = 'array' THEN
    FOR heatmap_item IN SELECT * FROM jsonb_array_elements(NEW.momentum_heatmap) LOOP
      IF (heatmap_item->>'seconds')::numeric > 64800 THEN
        has_anomaly := TRUE;
        EXIT; -- Found anomaly, no need to check further
      END IF;
    END LOOP;
  END IF;

  -- 3. Check weekly_hours (must not exceed 105 hours in a week)
  IF NEW.weekly_hours > 105 THEN
    has_anomaly := TRUE;
  END IF;

  -- 4. Check today_questions (must not exceed 1000 questions)
  IF NEW.today_questions > 1000 THEN
    has_anomaly := TRUE;
  END IF;

  -- Dynamically assign invalidation status
  NEW.leaderboard_invalidated := has_anomaly;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles
DROP TRIGGER IF EXISTS trg_profiles_leaderboard_guardrail ON public.profiles;
CREATE TRIGGER trg_profiles_leaderboard_guardrail
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_leaderboard_invalidation();

-- Backfill invalidations for existing profiles
UPDATE public.profiles p
SET leaderboard_invalidated = TRUE
WHERE p.today_study_seconds > 64800
   OR p.weekly_hours > 105
   OR p.today_questions > 1000
   OR EXISTS (
     SELECT 1 
     FROM jsonb_array_elements(p.momentum_heatmap) AS item 
     WHERE (item->>'seconds')::numeric > 64800
   );
