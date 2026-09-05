"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin/server";
import type { ChallengeStatus } from "@/types/database";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const admin = await isAdminUser(supabase, user.id);
  if (!admin) throw new Error("Not authorized");
  return { supabase, user };
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("profiles").update({ role }).eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/admin");
}

export async function setUserActive(userId: string, isActive: boolean) {
  const { supabase, user } = await requireAdmin();
  if (user.id === userId && !isActive) {
    throw new Error("Cannot deactivate your own account");
  }
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/admin");
}

export async function updateChallengeStatus(challengeId: string, status: ChallengeStatus) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("challenges").update({ status }).eq("id", challengeId);
  if (error) throw error;
  revalidatePath("/admin");
}

export async function updateChallengeDetails(
  challengeId: string,
  input: { start_date: string; end_date: string; step_goal: number }
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("challenges")
    .update({
      start_date: input.start_date,
      end_date: input.end_date,
      step_goal: input.step_goal,
    })
    .eq("id", challengeId);
  if (error) throw error;

  const { error: backfillError } = await supabase.rpc("backfill_challenge_steps", {
    p_challenge_id: challengeId,
  });
  if (backfillError) throw backfillError;

  revalidatePath("/admin");
}

export async function regenerateChallengeInvite(challengeId: string) {
  const { supabase } = await requireAdmin();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase
    .from("challenges")
    .update({ invite_token: token })
    .eq("id", challengeId);
  if (error) throw error;
  revalidatePath("/admin");
  return token;
}

export async function repairLeaderboards() {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("reconcile_all_challenge_steps");
  if (error) throw error;
  revalidatePath("/admin");
}

export async function exportUsersCsvAction() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("admin_user_list")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 999);
  if (error) throw error;
  return data ?? [];
}

export async function exportChallengeLeaderboardAction(challengeId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("challenge_leaderboard")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("rank", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
