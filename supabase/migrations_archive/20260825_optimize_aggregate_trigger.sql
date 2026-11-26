-- Migration: Optimize aggregate → profile trigger (Issue #2)
-- Description: Splits trg_sync_weekly_hours_to_profile into separate INSERT
-- and UPDATE triggers so the UPDATE trigger can use a WHEN clause to skip
-- execution when buckets_weekly_json did not change. (PostgreSQL disallows
-- referencing OLD in WHEN clauses of triggers that include INSERT events).

DROP TRIGGER IF EXISTS trg_sync_weekly_hours_to_profile ON public.user_study_aggregate;
DROP TRIGGER IF EXISTS trg_sync_weekly_hours_to_profile_insert ON public.user_study_aggregate;
DROP TRIGGER IF EXISTS trg_sync_weekly_hours_to_profile_update ON public.user_study_aggregate;

CREATE TRIGGER trg_sync_weekly_hours_to_profile_insert
AFTER INSERT ON public.user_study_aggregate
FOR EACH ROW
WHEN (NEW.buckets_weekly_json IS NOT NULL)
EXECUTE FUNCTION public.sync_weekly_hours_to_profile();

CREATE TRIGGER trg_sync_weekly_hours_to_profile_update
AFTER UPDATE ON public.user_study_aggregate
FOR EACH ROW
WHEN (
  OLD.buckets_weekly_json IS DISTINCT FROM NEW.buckets_weekly_json
)
EXECUTE FUNCTION public.sync_weekly_hours_to_profile();

