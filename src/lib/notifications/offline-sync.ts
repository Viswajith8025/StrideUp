import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clearPendingRead,
  getPendingReads,
} from "@/lib/offline/notification-queue";
import { markAllRead, markRead } from "@/lib/notifications/service";

export interface FlushPendingReadsResult {
  flushed: number;
  error: string | null;
}

export interface FlushPendingReadsCallbacks {
  onRead?: (notificationId: string) => void;
  onReadAll?: () => void;
}

export async function flushPendingNotificationReads(
  supabase: SupabaseClient,
  userId: string,
  callbacks: FlushPendingReadsCallbacks = {}
): Promise<FlushPendingReadsResult> {
  const pending = await getPendingReads();
  const mine = pending.filter((p) => p.userId === userId);
  let flushed = 0;

  for (const item of mine) {
    if (!item.id) continue;
    try {
      if (item.markAll) {
        await markAllRead(supabase, userId);
        callbacks.onReadAll?.();
      } else if (item.notificationId) {
        await markRead(supabase, userId, item.notificationId);
        callbacks.onRead?.(item.notificationId);
      }
      await clearPendingRead(item.id);
      flushed++;
    } catch {
      return {
        flushed,
        error: "Could not sync read status. Will retry when online.",
      };
    }
  }

  return { flushed, error: null };
}
