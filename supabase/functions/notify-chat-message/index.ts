import { corsHeaders, isAuthorized, jsonResponse } from "../_shared/auth.ts";
import { getServiceClient, sendPushToUsers } from "../_shared/push.ts";

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: {
    id: string;
    room_id: string;
    user_id: string;
    message: string;
    created_at: string;
  };
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
    if (payload.type !== "INSERT" || payload.table !== "messages" || !payload.record) {
      return jsonResponse({ ok: true, skipped: true });
    }

    const { room_id, user_id: senderId, message, id: messageId, created_at } = payload.record;
    const supabase = getServiceClient();
    const messageAt = new Date(created_at);

    const { data: members } = await supabase
      .from("chat_members")
      .select("user_id, last_read_at")
      .eq("room_id", room_id)
      .neq("user_id", senderId);

    const recipientIds = (members ?? [])
      .filter((member) => {
        if (!member.last_read_at) return true;
        return new Date(member.last_read_at as string) <= messageAt;
      })
      .map((member) => member.user_id as string);

    if (!recipientIds.length) {
      return jsonResponse({ ok: true, sent: 0, persisted: 0 });
    }

    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", senderId)
      .single();

    const senderName = sender?.display_name ?? "Someone";
    const preview = message.length > 120 ? `${message.slice(0, 117)}...` : message;

    const result = await sendPushToUsers(supabase, {
      user_ids: recipientIds,
      category: "push_chat",
      title: `New message from ${senderName}`,
      body: preview,
      url: `/chats/${room_id}`,
      tag: `chat:${room_id}`,
      notification_type: `push:chat:${messageId}`,
    });

    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
