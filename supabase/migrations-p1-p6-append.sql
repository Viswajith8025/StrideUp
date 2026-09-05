-- Append to setup.sql after base schema (P1–P4 restored from stash snapshot; P6 new).
-- Run in Supabase SQL Editor if setup.sql base was applied without these sections.

-- =============================================================================
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

-- =============================================================================
-- Migration: Web Push notifications (P2)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS push_daily_goal BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_streak BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_challenge BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_chat BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_own ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- Migration: Push timing and persistence (P2.1)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

UPDATE public.profiles SET timezone = 'UTC' WHERE timezone IS NULL OR timezone = '';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS local_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_scheduled_dedup
  ON public.notifications (user_id, category, local_date)
  WHERE category IN ('push_daily_goal', 'push_streak', 'push_challenge');

CREATE OR REPLACE FUNCTION public.get_users_at_local_nudge_hour()
RETURNS TABLE (
  user_id UUID,
  timezone TEXT,
  local_date DATE,
  daily_step_goal INTEGER
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    p.user_id,
    COALESCE(NULLIF(p.timezone, ''), 'UTC') AS timezone,
    (now() AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'UTC'))::date AS local_date,
    p.daily_step_goal
  FROM public.profiles p
  WHERE EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'UTC'))) = 19;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_at_local_nudge_hour() TO service_role;

-- =============================================================================
-- Migration: In-app notification center (P3)
-- =============================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS url TEXT;

CREATE OR REPLACE FUNCTION public.get_users_at_local_nudge_hour()
RETURNS TABLE (
  user_id UUID,
  timezone TEXT,
  local_date DATE,
  daily_step_goal INTEGER
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    p.user_id,
    COALESCE(NULLIF(p.timezone, ''), 'UTC') AS timezone,
    (now() AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'UTC'))::date AS local_date,
    p.daily_step_goal
  FROM public.profiles p
  WHERE EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'UTC'))) >= 19
    AND EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'UTC'))) < 22;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =============================================================================
-- Migration: Streaks and social layer (P4)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.challenge_cheers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT (CURRENT_DATE),
  emoji TEXT NOT NULL CHECK (emoji IN ('👏', '🔥', '💪', '⭐', '🎉')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, from_user_id, to_user_id, date, emoji)
);

CREATE INDEX IF NOT EXISTS idx_challenge_cheers_challenge ON public.challenge_cheers(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_cheers_to_user ON public.challenge_cheers(to_user_id, date);

ALTER TABLE public.challenge_cheers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS challenge_cheers_select ON public.challenge_cheers;
CREATE POLICY challenge_cheers_select ON public.challenge_cheers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.challenge_members cm
      WHERE cm.challenge_id = challenge_cheers.challenge_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS challenge_cheers_insert ON public.challenge_cheers;
CREATE POLICY challenge_cheers_insert ON public.challenge_cheers
  FOR INSERT WITH CHECK (
    from_user_id = auth.uid()
    AND from_user_id <> to_user_id
    AND EXISTS (
      SELECT 1 FROM public.challenge_members cm
      WHERE cm.challenge_id = challenge_id
        AND cm.user_id = from_user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.challenge_members cm
      WHERE cm.challenge_id = challenge_id
        AND cm.user_id = to_user_id
    )
  );

DROP POLICY IF EXISTS challenge_cheers_delete ON public.challenge_cheers;
CREATE POLICY challenge_cheers_delete ON public.challenge_cheers
  FOR DELETE USING (from_user_id = auth.uid());

CREATE OR REPLACE VIEW public.challenge_activity
WITH (security_invoker = true) AS
SELECT
  cm.challenge_id,
  'join'::text AS event_type,
  cm.user_id AS actor_user_id,
  NULL::uuid AS target_user_id,
  p.display_name AS actor_name,
  p.avatar_url AS actor_avatar,
  NULL::text AS target_name,
  NULL::text AS target_avatar,
  NULL::text AS emoji,
  cm.joined_at AS created_at
FROM public.challenge_members cm
JOIN public.profiles p ON p.user_id = cm.user_id
UNION ALL
SELECT
  cds.challenge_id,
  'goal_hit'::text AS event_type,
  cds.user_id AS actor_user_id,
  NULL::uuid AS target_user_id,
  p.display_name AS actor_name,
  p.avatar_url AS actor_avatar,
  NULL::text AS target_name,
  NULL::text AS target_avatar,
  NULL::text AS emoji,
  ((cds.date::text || 'T23:59:59Z')::timestamptz) AS created_at
FROM public.challenge_daily_steps cds
JOIN public.challenges c ON c.id = cds.challenge_id
JOIN public.profiles p ON p.user_id = cds.user_id
WHERE c.step_goal > 0 AND cds.steps >= c.step_goal
UNION ALL
SELECT
  cc.challenge_id,
  'cheer'::text AS event_type,
  cc.from_user_id AS actor_user_id,
  cc.to_user_id AS target_user_id,
  fp.display_name AS actor_name,
  fp.avatar_url AS actor_avatar,
  tp.display_name AS target_name,
  tp.avatar_url AS target_avatar,
  cc.emoji,
  cc.created_at
FROM public.challenge_cheers cc
JOIN public.profiles fp ON fp.user_id = cc.from_user_id
JOIN public.profiles tp ON tp.user_id = cc.to_user_id;

-- =============================================================================
-- Migration: Admin panel v2 (P6)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE VIEW public.admin_user_list
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.user_id,
  p.display_name,
  p.role,
  p.is_active,
  p.daily_step_goal,
  p.created_at,
  COALESCE(SUM(da.steps), 0)::bigint AS total_steps
FROM public.profiles p
LEFT JOIN public.daily_activity da ON da.user_id = p.user_id
GROUP BY p.id, p.user_id, p.display_name, p.role, p.is_active, p.daily_step_goal, p.created_at;

CREATE OR REPLACE VIEW public.admin_metrics
WITH (security_invoker = true) AS
SELECT
  (
    SELECT COUNT(DISTINCT da.user_id)::bigint
    FROM public.daily_activity da
    WHERE da.date >= CURRENT_DATE - 30
  ) AS dau_30d,
  (
    SELECT COALESCE(SUM(da.steps), 0)::bigint
    FROM public.daily_activity da
    WHERE da.date >= date_trunc('week', CURRENT_DATE)::date
  ) AS total_steps_this_week,
  (
    SELECT COUNT(*)::bigint FROM public.challenges WHERE status = 'active'
  ) AS active_challenges,
  (
    SELECT COUNT(*)::bigint
    FROM public.profiles
    WHERE created_at >= date_trunc('week', CURRENT_DATE)
  ) AS new_signups_this_week,
  (
    SELECT COUNT(*)::bigint FROM public.push_subscriptions
  ) AS push_subscription_count;
