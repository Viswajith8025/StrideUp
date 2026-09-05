import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheerEmoji } from "./constants";

export interface SendCheerInput {
  challengeId: string;
  fromUserId: string;
  toUserId: string;
  emoji: CheerEmoji;
  date: string;
}

export interface SendCheerResult {
  ok: boolean;
  duplicate: boolean;
}

export async function sendCheer(
  supabase: SupabaseClient,
  input: SendCheerInput
): Promise<SendCheerResult> {
  const { data, error } = await supabase
    .from("challenge_cheers")
    .insert({
      challenge_id: input.challengeId,
      from_user_id: input.fromUserId,
      to_user_id: input.toUserId,
      emoji: input.emoji,
      date: input.date,
    })
    .select("id")
    .maybeSingle();

  if (error?.code === "23505") {
    return { ok: true, duplicate: true };
  }
  if (error) throw error;
  if (!data?.id) {
    return { ok: true, duplicate: true };
  }

  return { ok: true, duplicate: false };
}
