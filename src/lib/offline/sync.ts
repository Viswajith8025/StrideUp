import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";
import { addSteps } from "@/lib/steps/service";
import { getPendingUpdates, clearPendingUpdate } from "./queue";

export async function flushPendingUpdates(supabase: SupabaseClient, profile: Profile) {
  const pending = await getPendingUpdates();
  const userPending = pending.filter((p) => p.userId === profile.user_id);

  for (const item of userPending) {
    if (!item.id) continue;
    try {
      await addSteps(supabase, profile.user_id, profile, item.steps, item.source as "manual" | "motion");
      await clearPendingUpdate(item.id);
    } catch {
      break;
    }
  }
}

export async function getPendingCount(userId: string): Promise<number> {
  const pending = await getPendingUpdates();
  return pending.filter((p) => p.userId === userId).length;
}

export async function getPendingStepsTotal(userId: string): Promise<number> {
  const pending = await getPendingUpdates();
  return pending.filter((p) => p.userId === userId).reduce((s, p) => s + p.steps, 0);
}

export { queueActivityUpdate, getPendingUpdates, clearPendingUpdate } from "./queue";
