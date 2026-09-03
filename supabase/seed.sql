-- =============================================================================
-- StrideUp — Development Seed Data
-- =============================================================================
-- Run AFTER setup.sql and AFTER creating test users via Supabase Auth.
-- Replace USER_ID_1, USER_ID_2, USER_ID_3 with actual auth.users UUIDs.
-- =============================================================================

-- Example: UPDATE profiles SET role = 'admin' WHERE user_id = 'USER_ID_1';

-- INSERT INTO public.challenges (name, description, start_date, end_date, step_goal, created_by, status)
-- VALUES (
--   'September Step Challenge',
--   'Walk 50,000 steps this month!',
--   CURRENT_DATE - INTERVAL '7 days',
--   CURRENT_DATE + INTERVAL '23 days',
--   50000,
--   'USER_ID_1',
--   'active'
-- );

-- Historical daily activity and challenge data should be inserted after users exist.
-- Use the app import feature or admin panel for realistic seed data in development.
