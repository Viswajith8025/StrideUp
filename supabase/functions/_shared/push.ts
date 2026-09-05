import webpush from "npm:web-push@3";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type PushCategory = "push_daily_goal" | "push_streak" | "push_challenge" | "push_chat";

const SCHEDULED_CATEGORIES: PushCategory[] = ["push_daily_goal", "push_streak", "push_challenge"];

export interface SendPushPayload {
  user_ids: string[];
  category: PushCategory;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notification_type?: string;
  local_date?: string;
  skipPreferenceCheck?: boolean;
  skipPersist?: boolean;
}

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service credentials are not configured");
  return createClient(url, key);
}

export function configureWebPush() {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@strideup.app";
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured");
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function alreadySentScheduled(
  supabase: SupabaseClient,
  userId: string,
  category: PushCategory,
  localDate: string
): Promise<boolean> {
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("local_date", localDate)
    .maybeSingle();
  return Boolean(data);
}

async function persistNotification(
  supabase: SupabaseClient,
  userId: string,
  payload: SendPushPayload
): Promise<boolean> {
  const { category, title, body, notification_type, local_date, url = "/home" } = payload;
  const row = {
    user_id: userId,
    title,
    body,
    type: notification_type ?? payload.tag ?? category,
    category,
    local_date: local_date ?? null,
    url,
  };

  if (SCHEDULED_CATEGORIES.includes(category) && local_date) {
    if (await alreadySentScheduled(supabase, userId, category, local_date)) {
      return false;
    }
  }

  const { error } = await supabase.from("notifications").insert(row, { ignoreDuplicates: true });
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

export async function sendPushToUsers(
  supabase: SupabaseClient,
  payload: SendPushPayload
): Promise<{ sent: number; failed: number; persisted: number; skipped: number }> {
  const {
    user_ids,
    category,
    title,
    body,
    url = "/home",
    tag,
    skipPreferenceCheck,
    local_date,
    skipPersist,
  } = payload;

  if (!user_ids.length) return { sent: 0, failed: 0, persisted: 0, skipped: 0 };

  let persisted = 0;
  let skipped = 0;

  if (!skipPersist) {
    for (const userId of user_ids) {
      const inserted = await persistNotification(supabase, userId, payload);
      if (inserted) persisted++;
      else skipped++;
    }
  }

  let pushTargetIds = new Set(user_ids);

  if (!skipPreferenceCheck) {
    const { data: settingsRows, error: settingsError } = await supabase
      .from("app_settings")
      .select(`user_id, notifications_enabled, ${category}`)
      .in("user_id", user_ids);

    if (settingsError) throw settingsError;

    pushTargetIds = new Set(
      (settingsRows ?? [])
        .filter((row) => row.notifications_enabled && row[category])
        .map((row) => row.user_id as string)
    );
  }

  if (!pushTargetIds.size) {
    return { sent: 0, failed: 0, persisted, skipped };
  }

  configureWebPush();

  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", [...pushTargetIds]);

  if (subsError) throw subsError;

  let sent = 0;
  let failed = 0;
  const pushBody = JSON.stringify({ title, body, url, tag: tag ?? category });

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        pushBody
      );
      sent++;
    } catch (error) {
      failed++;
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }

  return { sent, failed, persisted, skipped };
}
