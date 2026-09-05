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