-- =============================================================================
-- Migration: UAT security fixes (invite lookup, backfill auth, join policy)
-- =============================================================================

-- F-02: Limited invite preview without opening challenges table to all users
CREATE OR REPLACE FUNCTION public.get_challenge_by_invite_token(p_token text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  start_date date,
  end_date date,
  step_goal integer,
  status public.challenge_status,
  member_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    c.start_date,
    c.end_date,
    c.step_goal,
    c.status,
    (
      SELECT count(*)::bigint
      FROM public.challenge_members cm
      WHERE cm.challenge_id = c.id
    ) AS member_count
  FROM public.challenges c
  WHERE c.invite_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_challenge_by_invite_token(text) TO anon, authenticated;

-- F-04: Internal backfill for triggers; guarded wrapper for clients
CREATE OR REPLACE FUNCTION public.backfill_challenge_steps_internal(p_challenge_id uuid)
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

CREATE OR REPLACE FUNCTION public.backfill_challenge_steps(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.challenge_members cm
      WHERE cm.challenge_id = p_challenge_id
        AND cm.user_id = auth.uid()
    )
    OR coalesce(auth.jwt() ->> 'role', '') = 'service_role'
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  PERFORM public.backfill_challenge_steps_internal(p_challenge_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_challenges_activate_backfill_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.backfill_challenge_steps_internal(NEW.id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_challenge_steps_internal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_challenge_steps_internal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_challenge_steps(uuid) TO authenticated;

-- F-05: Restrict direct membership inserts; join via guarded RPC for invitees
DROP POLICY IF EXISTS challenge_members_insert ON public.challenge_members;
CREATE POLICY challenge_members_insert ON public.challenge_members FOR INSERT WITH CHECK (
  public.is_admin()
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.challenges c
      WHERE c.id = challenge_id
        AND c.created_by = auth.uid()
    )
  )
);

CREATE OR REPLACE FUNCTION public.join_challenge_with_invite(
  p_challenge_id uuid,
  p_invite_token text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF public.is_admin() THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1
    FROM public.challenges c
    WHERE c.id = p_challenge_id
      AND c.created_by = auth.uid()
  ) THEN
    NULL;
  ELSIF p_invite_token IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.challenges c
    WHERE c.id = p_challenge_id
      AND c.invite_token = p_invite_token
  ) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'not authorized to join this challenge';
  END IF;

  INSERT INTO public.challenge_members (challenge_id, user_id)
  VALUES (p_challenge_id, auth.uid())
  ON CONFLICT (challenge_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_challenge_with_invite(uuid, text) TO authenticated;
