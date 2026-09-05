-- =============================================================================
-- Migration: Challenge sync trigger hardening (P1.1)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_daily_activity_challenge_sync_delete_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_challenge_steps_for_day(OLD.user_id, OLD.date);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_activity_challenge_sync_delete ON public.daily_activity;
CREATE TRIGGER trg_daily_activity_challenge_sync_delete
  AFTER DELETE ON public.daily_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_daily_activity_challenge_sync_delete_fn();

CREATE OR REPLACE FUNCTION public.trg_challenges_activate_backfill_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.backfill_challenge_steps(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenges_activate_backfill ON public.challenges;
CREATE TRIGGER trg_challenges_activate_backfill
  AFTER UPDATE OF status ON public.challenges
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active')
  EXECUTE FUNCTION public.trg_challenges_activate_backfill_fn();

CREATE OR REPLACE FUNCTION public.trg_challenge_members_cleanup_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.challenge_daily_steps
  WHERE challenge_id = OLD.challenge_id
    AND user_id = OLD.user_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenge_members_cleanup ON public.challenge_members;
CREATE TRIGGER trg_challenge_members_cleanup
  AFTER DELETE ON public.challenge_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_challenge_members_cleanup_fn();