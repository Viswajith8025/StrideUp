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