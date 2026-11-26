-- Migration: sync_weekly_hours_to_profiles
-- Automatically updates profiles.weekly_hours whenever user_study_aggregate is updated,
-- and backfills existing profiles for the current ISO week.

CREATE OR REPLACE FUNCTION sync_weekly_hours_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  current_week TEXT;
  week_seconds NUMERIC;
  calc_hours NUMERIC;
BEGIN
  current_week := to_char(now(), 'IYYY-"W"IW');
  
  IF NEW.buckets_weekly_json IS NOT NULL AND NEW.buckets_weekly_json ? current_week THEN
    week_seconds := COALESCE((NEW.buckets_weekly_json->current_week->>'overall')::numeric, 0);
    calc_hours := ROUND((week_seconds / 3600.0), 2);
    
    UPDATE profiles
    SET weekly_hours = calc_hours
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_weekly_hours_to_profile ON user_study_aggregate;

CREATE TRIGGER trg_sync_weekly_hours_to_profile
AFTER INSERT OR UPDATE ON user_study_aggregate
FOR EACH ROW
EXECUTE FUNCTION sync_weekly_hours_to_profile();

-- Backfill existing profiles with current week's hours from user_study_aggregate
UPDATE profiles p
SET weekly_hours = ROUND(((u.buckets_weekly_json->to_char(now(), 'IYYY-"W"IW')->>'overall')::numeric / 3600.0), 2)
FROM user_study_aggregate u
WHERE p.id = u.user_id
  AND u.buckets_weekly_json IS NOT NULL
  AND u.buckets_weekly_json ? to_char(now(), 'IYYY-"W"IW');
