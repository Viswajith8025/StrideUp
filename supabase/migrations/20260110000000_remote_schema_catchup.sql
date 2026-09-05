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
