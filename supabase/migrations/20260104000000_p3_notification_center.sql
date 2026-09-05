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