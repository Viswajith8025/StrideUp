import type { SupabaseClient } from "@supabase/supabase-js";
import type { Challenge, LeaderboardEntry, ChallengeActivityEvent, ChallengeInvitePreview } from "@/types/database";

export async function getChallenges(supabase: SupabaseClient, userId: string) {
  const { data: memberships } = await supabase
    .from("challenge_members")
    .select("challenge_id")
    .eq("user_id", userId);

  const memberIds = (memberships ?? []).map((m) => m.challenge_id);

  const { data: created } = await supabase
    .from("challenges")
    .select("*")
    .eq("created_by", userId);

  const { data: joined } = memberIds.length
    ? await supabase.from("challenges").select("*").in("id", memberIds)
    : { data: [] };

  const all = [...(created ?? []), ...(joined ?? [])] as Challenge[];
  const unique = Array.from(new Map(all.map((c) => [c.id, c])).values());
  return unique.sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export async function getChallenge(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("challenges").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Challenge;
}

export async function createChallenge(
  supabase: SupabaseClient,
  userId: string,
  input: { name: string; description?: string; start_date: string; end_date: string; step_goal: number }
) {
  const { data, error } = await supabase
    .from("challenges")
    .insert({ ...input, created_by: userId, status: "upcoming" })
    .select()
    .single();
  if (error) throw error;

  await joinChallenge(supabase, userId, data.id);
  return data as Challenge;
}

export async function joinChallenge(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string,
  inviteToken?: string
) {
  const { data: challenge } = await supabase
    .from("challenges")
    .select("created_by")
    .eq("id", challengeId)
    .maybeSingle();

  if (challenge?.created_by === userId) {
    const { error: memberError } = await supabase
      .from("challenge_members")
      .upsert({ challenge_id: challengeId, user_id: userId }, { onConflict: "challenge_id,user_id" });
    if (memberError) throw memberError;
  } else {
    const { error: joinError } = await supabase.rpc("join_challenge_with_invite", {
      p_challenge_id: challengeId,
      p_invite_token: inviteToken ?? null,
    });
    if (joinError) throw joinError;
  }

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("challenge_id", challengeId)
    .maybeSingle();

  let roomId = room?.id;
  if (!roomId) {
    const { data: newRoom } = await supabase
      .from("chat_rooms")
      .insert({ challenge_id: challengeId, name: "Challenge Chat" })
      .select()
      .single();
    roomId = newRoom?.id;
  }

  if (roomId) {
    await supabase
      .from("chat_members")
      .upsert({ room_id: roomId, user_id: userId }, { onConflict: "room_id,user_id" });
  }

  const { error: backfillError } = await supabase.rpc("backfill_challenge_steps", {
    p_challenge_id: challengeId,
  });
  if (backfillError) throw backfillError;
}

export async function leaveChallenge(supabase: SupabaseClient, userId: string, challengeId: string) {
  await supabase.from("challenge_members").delete().eq("challenge_id", challengeId).eq("user_id", userId);
}

export async function getLeaderboard(supabase: SupabaseClient, challengeId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("challenge_leaderboard")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("rank", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function getMemberCount(supabase: SupabaseClient, challengeId: string) {
  const { count } = await supabase
    .from("challenge_members")
    .select("*", { count: "exact", head: true })
    .eq("challenge_id", challengeId);
  return count ?? 0;
}

export async function getChallengeActivity(
  supabase: SupabaseClient,
  challengeId: string,
  limit = 30
) {
  const { data, error } = await supabase
    .from("challenge_activity")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ChallengeActivityEvent[];
}

export async function getChallengeByToken(supabase: SupabaseClient, token: string) {
  const { data, error } = await supabase.rpc("get_challenge_by_invite_token", {
    p_token: token,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Challenge not found");
  return row as ChallengeInvitePreview;
}
