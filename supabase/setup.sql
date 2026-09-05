-- =============================================================================
-- StrideUp — Complete Supabase Setup (GENERATED)
-- =============================================================================
-- DO NOT EDIT DIRECTLY. Edit files in supabase/migrations/ then run:
--   node scripts/generate-setup-sql.mjs
-- =============================================================================

-- =============================================================================
-- StrideUp — Complete Supabase Setup
-- =============================================================================
-- Run once in Supabase SQL Editor. Safe to re-run where noted.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helpers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  avatar_url TEXT,
  weight_kg NUMERIC(5,2) CHECK (weight_kg IS NULL OR weight_kg > 0),
  height_cm NUMERIC(5,2) CHECK (height_cm IS NULL OR height_cm > 0),
  stride_length_cm NUMERIC(5,2) CHECK (stride_length_cm IS NULL OR stride_length_cm > 0),
  daily_step_goal INTEGER NOT NULL DEFAULT 6000 CHECK (daily_step_goal > 0),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily activity
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0),
  distance_km NUMERIC(8,3) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  calories INTEGER NOT NULL DEFAULT 0 CHECK (calories >= 0),
  active_minutes INTEGER NOT NULL DEFAULT 0 CHECK (active_minutes >= 0),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'motion', 'import', 'reconciled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON public.daily_activity(user_id, date DESC);

DROP TRIGGER IF EXISTS trg_daily_activity_updated_at ON public.daily_activity;
CREATE TRIGGER trg_daily_activity_updated_at
  BEFORE UPDATE ON public.daily_activity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Step events
CREATE TABLE IF NOT EXISTS public.step_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  steps INTEGER NOT NULL CHECK (steps > 0),
  source TEXT NOT NULL DEFAULT 'motion' CHECK (source IN ('manual', 'motion', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_step_events_user_ts ON public.step_events(user_id, timestamp DESC);

-- Challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  step_goal INTEGER NOT NULL DEFAULT 0 CHECK (step_goal >= 0),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status, start_date);

DROP TRIGGER IF EXISTS trg_challenges_updated_at ON public.challenges;
CREATE TRIGGER trg_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Challenge members
CREATE TABLE IF NOT EXISTS public.challenge_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_members_challenge ON public.challenge_members(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_members_user ON public.challenge_members(user_id);

-- Challenge daily steps
CREATE TABLE IF NOT EXISTS public.challenge_daily_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0),
  UNIQUE (challenge_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_challenge_daily_steps_challenge ON public.challenge_daily_steps(challenge_id, date);

-- Chat rooms
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL UNIQUE REFERENCES public.challenges(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Challenge Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat members
CREATE TABLE IF NOT EXISTS public.chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members(user_id);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at DESC);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- App settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('system', 'dark', 'light')),
  accent_color TEXT NOT NULL DEFAULT 'cyan' CHECK (accent_color IN ('red', 'yellow', 'green', 'cyan', 'purple', 'pink')),
  widget_theme TEXT NOT NULL DEFAULT 'dark' CHECK (widget_theme IN ('system', 'dark', 'light')),
  distance_unit TEXT NOT NULL DEFAULT 'km' CHECK (distance_unit IN ('km', 'mi')),
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),
  week_starts_on SMALLINT NOT NULL DEFAULT 0 CHECK (week_starts_on BETWEEN 0 AND 6),
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_goal_notifications BOOLEAN NOT NULL DEFAULT true,
  challenge_notifications BOOLEAN NOT NULL DEFAULT true,
  chat_notifications BOOLEAN NOT NULL DEFAULT true,
  streak_notifications BOOLEAN NOT NULL DEFAULT true,
  step_counter_setup_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'User'));
  INSERT INTO public.app_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Challenge status updater
CREATE OR REPLACE FUNCTION public.update_challenge_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'completed';
  ELSIF NEW.start_date <= CURRENT_DATE AND NEW.end_date >= CURRENT_DATE AND NEW.status = 'upcoming' THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenges_status ON public.challenges;
CREATE TRIGGER trg_challenges_status
  BEFORE INSERT OR UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_challenge_status();

-- Leaderboard view (security invoker)
CREATE OR REPLACE VIEW public.challenge_leaderboard
WITH (security_invoker = true) AS
SELECT
  cm.challenge_id,
  cm.user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(SUM(cds.steps), 0)::INTEGER AS total_steps,
  RANK() OVER (PARTITION BY cm.challenge_id ORDER BY COALESCE(SUM(cds.steps), 0) DESC) AS rank
FROM public.challenge_members cm
JOIN public.profiles p ON p.user_id = cm.user_id
LEFT JOIN public.challenge_daily_steps cds ON cds.challenge_id = cm.challenge_id AND cds.user_id = cm.user_id
GROUP BY cm.challenge_id, cm.user_id, p.display_name, p.avatar_url;

-- Admin helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_daily_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (
  user_id = auth.uid() OR public.is_admin()
);
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- Daily activity policies
DROP POLICY IF EXISTS daily_activity_all ON public.daily_activity;
CREATE POLICY daily_activity_all ON public.daily_activity FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Step events policies
DROP POLICY IF EXISTS step_events_all ON public.step_events;
CREATE POLICY step_events_all ON public.step_events FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Challenges policies
DROP POLICY IF EXISTS challenges_select ON public.challenges;
CREATE POLICY challenges_select ON public.challenges FOR SELECT USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.challenge_members cm WHERE cm.challenge_id = id AND cm.user_id = auth.uid())
  OR public.is_admin()
);
DROP POLICY IF EXISTS challenges_insert ON public.challenges;
CREATE POLICY challenges_insert ON public.challenges FOR INSERT WITH CHECK (created_by = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS challenges_update ON public.challenges;
CREATE POLICY challenges_update ON public.challenges FOR UPDATE USING (created_by = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS challenges_delete ON public.challenges;
CREATE POLICY challenges_delete ON public.challenges FOR DELETE USING (created_by = auth.uid() OR public.is_admin());

-- Challenge members policies
DROP POLICY IF EXISTS challenge_members_select ON public.challenge_members;
CREATE POLICY challenge_members_select ON public.challenge_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.challenge_members cm WHERE cm.challenge_id = challenge_id AND cm.user_id = auth.uid())
  OR public.is_admin()
);
DROP POLICY IF EXISTS challenge_members_insert ON public.challenge_members;
CREATE POLICY challenge_members_insert ON public.challenge_members FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS challenge_members_delete ON public.challenge_members;
CREATE POLICY challenge_members_delete ON public.challenge_members FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- Challenge daily steps policies
DROP POLICY IF EXISTS challenge_daily_steps_select ON public.challenge_daily_steps;
CREATE POLICY challenge_daily_steps_select ON public.challenge_daily_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.challenge_members cm WHERE cm.challenge_id = challenge_daily_steps.challenge_id AND cm.user_id = auth.uid())
);
DROP POLICY IF EXISTS challenge_daily_steps_all ON public.challenge_daily_steps;
CREATE POLICY challenge_daily_steps_all ON public.challenge_daily_steps FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Chat rooms policies
DROP POLICY IF EXISTS chat_rooms_select ON public.chat_rooms;
CREATE POLICY chat_rooms_select ON public.chat_rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = id AND cm.user_id = auth.uid())
);
DROP POLICY IF EXISTS chat_rooms_insert ON public.chat_rooms;
CREATE POLICY chat_rooms_insert ON public.chat_rooms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.challenge_members cm WHERE cm.challenge_id = challenge_id AND cm.user_id = auth.uid())
);

-- Chat members policies
DROP POLICY IF EXISTS chat_members_select ON public.chat_members;
CREATE POLICY chat_members_select ON public.chat_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = room_id AND cm.user_id = auth.uid())
);
DROP POLICY IF EXISTS chat_members_insert ON public.chat_members;
CREATE POLICY chat_members_insert ON public.chat_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- Messages policies
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = room_id AND cm.user_id = auth.uid())
);
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = room_id AND cm.user_id = auth.uid())
);

-- Notifications policies
DROP POLICY IF EXISTS notifications_all ON public.notifications;
CREATE POLICY notifications_all ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- App settings policies
DROP POLICY IF EXISTS app_settings_all ON public.app_settings;
CREATE POLICY app_settings_all ON public.app_settings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Realtime (idempotent on re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

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

GRANT EXECUTE ON FUNCTION public.get_users_at_local_nudge_hour() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

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

CREATE OR REPLACE VIEW public.admin_user_list
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.role,
  p.is_active,
  p.daily_step_goal,
  p.created_at,
  COALESCE(SUM(da.steps), 0)::bigint AS total_steps
FROM public.profiles p
LEFT JOIN public.daily_activity da ON da.user_id = p.user_id
GROUP BY p.id, p.user_id, p.display_name, p.avatar_url, p.role, p.is_active, p.daily_step_goal, p.created_at;

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

-- =============================================================================
-- Migration: Profile avatars (P7)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  524288,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Migration: UAT security fixes (invite lookup, backfill auth, join policy)
-- =============================================================================

-- Ensure is_admin exists (remote DBs bootstrapped from older setup.sql may lack it)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- F-02: Limited invite preview without opening challenges table to all users
CREATE OR REPLACE FUNCTION public.get_challenge_by_invite_token(p_token text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  start_date date,
  end_date date,
  step_goal integer,
  status text,
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

-- =============================================================================
-- Migration: Ensure signup trigger + backfill profiles/settings
-- =============================================================================
-- Remote DBs bootstrapped without running base_schema triggers need this.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'User')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.app_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users missing profile / settings
INSERT INTO public.profiles (user_id, display_name)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'User')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
);

INSERT INTO public.app_settings (user_id)
SELECT u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_settings s WHERE s.user_id = u.id
);

-- =============================================================================
-- Migration: Catch up remote schema that was marked applied but never run
-- =============================================================================

-- Profiles columns (P2.1 + P6)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

UPDATE public.profiles SET timezone = 'UTC' WHERE timezone IS NULL OR timezone = '';

-- App settings push prefs (P2)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS push_daily_goal BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_streak BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_challenge BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_chat BOOLEAN NOT NULL DEFAULT false;

-- Notifications columns (P2.1 + P3)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS local_date DATE,
  ADD COLUMN IF NOT EXISTS url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_scheduled_dedup
  ON public.notifications (user_id, category, local_date)
  WHERE category IN ('push_daily_goal', 'push_streak', 'push_challenge');

-- Push subscriptions (P2)
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

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_own ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Challenge cheers (P4)
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

-- Views
CREATE OR REPLACE VIEW public.challenge_leaderboard
WITH (security_invoker = true) AS
SELECT
  cm.challenge_id,
  cm.user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(SUM(cds.steps), 0)::INTEGER AS total_steps,
  RANK() OVER (PARTITION BY cm.challenge_id ORDER BY COALESCE(SUM(cds.steps), 0) DESC) AS rank
FROM public.challenge_members cm
JOIN public.profiles p ON p.user_id = cm.user_id
LEFT JOIN public.challenge_daily_steps cds ON cds.challenge_id = cm.challenge_id AND cds.user_id = cm.user_id
GROUP BY cm.challenge_id, cm.user_id, p.display_name, p.avatar_url;

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

CREATE OR REPLACE VIEW public.admin_user_list
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.role,
  p.is_active,
  p.daily_step_goal,
  p.created_at,
  COALESCE(SUM(da.steps), 0)::bigint AS total_steps
FROM public.profiles p
LEFT JOIN public.daily_activity da ON da.user_id = p.user_id
GROUP BY p.id, p.user_id, p.display_name, p.avatar_url, p.role, p.is_active, p.daily_step_goal, p.created_at;

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

-- Core RLS (was off on remote profiles)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_daily_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (
  user_id = auth.uid() OR public.is_admin()
);
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS daily_activity_all ON public.daily_activity;
CREATE POLICY daily_activity_all ON public.daily_activity FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS step_events_all ON public.step_events;
CREATE POLICY step_events_all ON public.step_events FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS challenges_select ON public.challenges;
CREATE POLICY challenges_select ON public.challenges FOR SELECT USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.challenge_members cm WHERE cm.challenge_id = id AND cm.user_id = auth.uid())
  OR public.is_admin()
);
DROP POLICY IF EXISTS challenges_insert ON public.challenges;
CREATE POLICY challenges_insert ON public.challenges FOR INSERT WITH CHECK (created_by = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS challenges_update ON public.challenges;
CREATE POLICY challenges_update ON public.challenges FOR UPDATE USING (created_by = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS challenges_delete ON public.challenges;
CREATE POLICY challenges_delete ON public.challenges FOR DELETE USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS challenge_members_select ON public.challenge_members;
CREATE POLICY challenge_members_select ON public.challenge_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.challenge_members cm WHERE cm.challenge_id = challenge_id AND cm.user_id = auth.uid())
  OR public.is_admin()
);
DROP POLICY IF EXISTS challenge_members_insert ON public.challenge_members;
CREATE POLICY challenge_members_insert ON public.challenge_members FOR INSERT WITH CHECK (
  public.is_admin()
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.created_by = auth.uid()
    )
  )
);
DROP POLICY IF EXISTS challenge_members_delete ON public.challenge_members;
CREATE POLICY challenge_members_delete ON public.challenge_members FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS challenge_daily_steps_select ON public.challenge_daily_steps;
CREATE POLICY challenge_daily_steps_select ON public.challenge_daily_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.challenge_members cm WHERE cm.challenge_id = challenge_daily_steps.challenge_id AND cm.user_id = auth.uid())
);
DROP POLICY IF EXISTS challenge_daily_steps_all ON public.challenge_daily_steps;
CREATE POLICY challenge_daily_steps_all ON public.challenge_daily_steps FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS chat_rooms_select ON public.chat_rooms;
CREATE POLICY chat_rooms_select ON public.chat_rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = id AND cm.user_id = auth.uid())
);
DROP POLICY IF EXISTS chat_rooms_insert ON public.chat_rooms;
CREATE POLICY chat_rooms_insert ON public.chat_rooms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.challenge_members cm WHERE cm.challenge_id = challenge_id AND cm.user_id = auth.uid())
);

DROP POLICY IF EXISTS chat_members_select ON public.chat_members;
CREATE POLICY chat_members_select ON public.chat_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = room_id AND cm.user_id = auth.uid())
);
DROP POLICY IF EXISTS chat_members_insert ON public.chat_members;
CREATE POLICY chat_members_insert ON public.chat_members FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS chat_members_update ON public.chat_members;
CREATE POLICY chat_members_update ON public.chat_members FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = room_id AND cm.user_id = auth.uid())
);
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = room_id AND cm.user_id = auth.uid())
);

DROP POLICY IF EXISTS notifications_all ON public.notifications;
CREATE POLICY notifications_all ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS app_settings_all ON public.app_settings;
CREATE POLICY app_settings_all ON public.app_settings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Avatars bucket (P7)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  524288,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
