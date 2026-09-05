import { corsHeaders, isAuthorized, jsonResponse } from "../_shared/auth.ts";
import { getServiceClient, sendPushToUsers } from "../_shared/push.ts";

/** Enforcing copy — rate limit for cheer notifications per sender→recipient per day. */
const MAX_CHEER_NOTIFICATIONS_PER_RECIPIENT_PER_DAY = 20;

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: {
    id: string;
    challenge_id: string;
    from_user_id: string;
    to_user_id: string;
    emoji: string;
    date: string;
    created_at: string;
  };
}

async function notifyCheer(cheerId: string) {
  const supabase = getServiceClient();

  const { data: cheer, error: cheerError } = await supabase
    .from("challenge_cheers")
    .select(
      "id, challenge_id, from_user_id, to_user_id, emoji, date, created_at, challenge:challenges(name)"
    )
    .eq("id", cheerId)
    .single();

  if (cheerError || !cheer) {
    return jsonResponse({ error: "Cheer not found" }, 404);
  }

  const challengeName =
    (cheer.challenge as { name?: string } | null)?.name ?? "a challenge";
  const dayStart = `${cheer.date}T00:00:00.000Z`;
  const dayEnd = `${cheer.date}T23:59:59.999Z`;

  const { count: sentToday } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", cheer.to_user_id)
    .eq("category", "challenge")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .like("type", `cheer:${cheer.from_user_id}:%`);

  if ((sentToday ?? 0) >= MAX_CHEER_NOTIFICATIONS_PER_RECIPIENT_PER_DAY) {
    return jsonResponse({ ok: true, skipped: true, reason: "rate_limited" });
  }

  const { data: sender } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", cheer.from_user_id)
    .single();

  const senderName = sender?.display_name ?? "Someone";
  const title = `${senderName} cheered you!`;
  const body = `${cheer.emoji} in ${challengeName}`;
  const url = `/challenges/${cheer.challenge_id}`;
  const notificationType = `cheer:${cheer.from_user_id}:${cheer.date}:${cheer.id}`;

  const { error: insertError } = await supabase.from("notifications").insert({
    user_id: cheer.to_user_id,
    title,
    body,
    type: notificationType,
    category: "challenge",
    local_date: null,
    url,
  });

  if (insertError) throw insertError;

  const pushResult = await sendPushToUsers(supabase, {
    user_ids: [cheer.to_user_id],
    category: "push_challenge",
    title,
    body,
    url,
    tag: `cheer:${cheer.challenge_id}`,
    notification_type: notificationType,
    skipPersist: true,
  });

  return jsonResponse({ ok: true, ...pushResult });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = (await req.json()) as WebhookPayload;

    if (payload.type === "INSERT" && payload.table === "challenge_cheers" && payload.record?.id) {
      return await notifyCheer(payload.record.id);
    }

    const cheerId = (payload as { cheer_id?: string }).cheer_id;
    if (cheerId) {
      return await notifyCheer(cheerId);
    }

    return jsonResponse({ ok: true, skipped: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
