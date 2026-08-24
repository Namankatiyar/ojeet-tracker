-- Migration: Optimize aggregate → profile trigger (Issue #2)
-- Description: Adds a WHEN clause to trg_sync_weekly_hours_to_profile so the
-- trigger function body is skipped entirely on aggregate writes where
-- buckets_weekly_json did not change. Previously every daily-bucket upsert
-- cascaded into a profiles UPDATE that mostly no-op'd via the in-function
-- `IS DISTINCT FROM` guard — but the function call and query still ran.
--
-- Note on the WHEN clause: for the INSERT half of the event list, OLD column
-- references evaluate to NULL in trigger WHEN expressions, so
-- `OLD.buckets_weekly_json IS DISTINCT FROM NEW.buckets_weekly_json` is TRUE
-- whenever NEW.buckets_weekly_json is non-NULL — i.e. INSERTs always fire,
-- which matches the previous behavior.

DROP TRIGGER IF EXISTS trg_sync_weekly_hours_to_profile ON public.user_study_aggregate;

CREATE TRIGGER trg_sync_weekly_hours_to_profile
AFTER INSERT OR UPDATE ON public.user_study_aggregate
FOR EACH ROW
WHEN (
  OLD.buckets_weekly_json IS DISTINCT FROM NEW.buckets_weekly_json
)
EXECUTE FUNCTION public.sync_weekly_hours_to_profile();
