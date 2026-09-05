import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/types/database";

export interface NotificationCursor {
  created_at: string;
  id: string;
}

export interface ListNotificationsOptions {
  cursor?: NotificationCursor | null;
  limit?: number;
}

export interface ListNotificationsResult {
  items: Notification[];
  nextCursor: NotificationCursor | null;
}

function mapRow(row: Notification): Notification {
  return {
    ...row,
    url: row.url ?? inferUrlFromNotification(row),
  };
}

export function inferUrlFromNotification(notification: Notification): string {
  if (notification.url) return notification.url;

  const type = notification.type ?? "";
  if (type.startsWith("push:chat:")) {
    const roomMatch = notification.body.match(/\/chats\/([a-f0-9-]+)/i);
    if (roomMatch) return `/chats/${roomMatch[1]}`;
  }
  if (type.includes("challenge_start:") || type.includes("challenge_end:")) {
    const id = type.split(":")[2];
    if (id) return `/challenges/${id}`;
  }
  if (notification.category === "push_challenge" || notification.category === "challenge") {
    return "/challenges";
  }
  if (notification.category === "push_chat") return "/chats";
  return "/home";
}

export async function listNotifications(
  supabase: SupabaseClient,
  userId: string,
  { cursor, limit = 20 }: ListNotificationsOptions = {}
): Promise<ListNotificationsResult> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.or(
      `and(created_at.eq.${cursor.created_at},id.lt.${cursor.id}),created_at.lt.${cursor.created_at}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Notification[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: items.map(mapRow),
    nextCursor: hasMore
      ? { created_at: items[items.length - 1].created_at, id: items[items.length - 1].id }
      : null,
  };
}

export async function unreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function markAllRead(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

const CACHE_KEY = "strideup:notifications:list";

export function cacheNotifications(items: Notification[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items, cachedAt: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

export function readCachedNotifications(): { items: Notification[]; cachedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { items: Notification[]; cachedAt: number };
  } catch {
    return null;
  }
}
