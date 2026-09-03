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
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (user_id = auth.uid());
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

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
