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