-- =============================================================================
-- Migration: Fix recursive RLS on chat_members / challenge_members
-- =============================================================================
-- Policies that SELECT the same table they protect cause PostgREST 500s.

CREATE OR REPLACE FUNCTION public.is_chat_room_member(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_members
    WHERE room_id = p_room_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_challenge_member(p_challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.challenge_members
    WHERE challenge_id = p_challenge_id
      AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_room_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_challenge_member(uuid) TO authenticated;

DROP POLICY IF EXISTS chat_members_select ON public.chat_members;
CREATE POLICY chat_members_select ON public.chat_members FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_chat_room_member(room_id)
);

DROP POLICY IF EXISTS challenge_members_select ON public.challenge_members;
CREATE POLICY challenge_members_select ON public.challenge_members FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_challenge_member(challenge_id)
  OR public.is_admin()
);

-- Keep room/message policies consistent (non-recursive via helper)
DROP POLICY IF EXISTS chat_rooms_select ON public.chat_rooms;
CREATE POLICY chat_rooms_select ON public.chat_rooms FOR SELECT USING (
  public.is_chat_room_member(id)
);

DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT USING (
  public.is_chat_room_member(room_id)
);

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND public.is_chat_room_member(room_id)
);
