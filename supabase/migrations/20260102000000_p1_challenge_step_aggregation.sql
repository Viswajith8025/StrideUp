-- Migration: Challenge step aggregation (P1)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_challenge_steps_for_day(p_user_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_steps integer;
BEGIN
  SELECT steps INTO v_steps
  FROM public.daily_activity
  WHERE user_id = p_user_id AND date = p_date;

  IF v_steps IS NULL THEN
    DELETE FROM public.challenge_daily_steps cds
    WHERE cds.user_id = p_user_id
      AND cds.date = p_date
      AND EXISTS (
        SELECT 1
        FROM public.challenge_members cm
        JOIN public.challenges c ON c.id = cm.challenge_id
        WHERE cm.challenge_id = cds.challenge_id
          AND cm.user_id = p_user_id
          AND p_date BETWEEN c.start_date AND c.end_date
          AND c.status <> 'upcoming'
      );
    RETURN;
  END IF;

  INSERT INTO public.challenge_daily_steps (challenge_id, user_id, date, steps)
  SELECT c.id, p_user_id, p_date, v_steps
  FROM public.challenges c
  INNER JOIN public.challenge_members cm ON cm.challenge_id = c.id AND cm.user_id = p_user_id
  WHERE p_date BETWEEN c.start_date AND c.end_date
    AND c.status <> 'upcoming'
  ON CONFLICT (challenge_id, user_id, date)
  DO UPDATE SET steps = EXCLUDED.steps;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_daily_activity_challenge_sync_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_challenge_steps_for_day(NEW.user_id, NEW.date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_activity_challenge_sync ON public.daily_activity;
CREATE TRIGGER trg_daily_activity_challenge_sync
  AFTER INSERT OR UPDATE OF steps ON public.daily_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_daily_activity_challenge_sync_fn();

CREATE OR REPLACE FUNCTION public.backfill_challenge_steps(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_member record;
  v_date date;
BEGIN
  SELECT start_date, end_date INTO v_start, v_end
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_start IS NULL THEN
    RETURN;
  END IF;

  FOR v_member IN
    SELECT user_id FROM public.challenge_members WHERE challenge_id = p_challenge_id
  LOOP
    v_date := v_start;
    WHILE v_date <= v_end LOOP
      PERFORM public.sync_challenge_steps_for_day(v_member.user_id, v_date);
      v_date := v_date + 1;
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_all_challenge_steps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF NOT (
    public.is_admin()
    OR coalesce(auth.jwt() ->> 'role', '') = 'service_role'
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  FOR r IN SELECT user_id, date FROM public.daily_activity LOOP
    PERFORM public.sync_challenge_steps_for_day(r.user_id, r.date);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_challenge_steps_for_day(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_challenge_steps(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_all_challenge_steps() TO service_role;