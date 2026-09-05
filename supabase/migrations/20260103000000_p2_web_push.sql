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