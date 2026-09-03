import type { SupabaseClient } from "@supabase/supabase-js";
import type { Challenge, ChallengeMember, LeaderboardEntry } from "@/types/database";

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

export async function joinChallenge(supabase: SupabaseClient, userId: string, challengeId: string) {
  const { error: memberError } = await supabase
    .from("challenge_members")
    .upsert({ challenge_id: challengeId, user_id: userId }, { onConflict: "challenge_id,user_id" });
  if (memberError) throw memberError;

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

export async function getChallengeByToken(supabase: SupabaseClient, token: string) {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("invite_token", token)
    .single();
  if (error) throw error;
  return data as Challenge;
}

export async function syncChallengeSteps(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string,
  date: string,
  steps: number
) {
  await supabase
    .from("challenge_daily_steps")
    .upsert({ challenge_id: challengeId, user_id: userId, date, steps }, { onConflict: "challenge_id,user_id,date" });
}
