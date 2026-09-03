import type { DailyActivity, Profile } from "@/types/database";
import { enrichActivity, reconcileSteps } from "@/lib/calculations";
import { toLocalDateString } from "@/utils/date";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDailyActivity(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<DailyActivity | null> {
  const { data, error } = await supabase
    .from("daily_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data as DailyActivity | null;
}

export async function getActivityRange(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyActivity[]> {
  const { data, error } = await supabase
    .from("daily_activity")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DailyActivity[];
}

export async function upsertDailyActivity(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
  date: string,
  steps: number,
  source: "manual" | "motion" | "import"
): Promise<DailyActivity> {
  const existing = await getDailyActivity(supabase, userId, date);
  let finalSteps = steps;
  let finalSource = source;

  if (existing) {
    const reconciled = reconcileSteps(existing.steps, steps, existing.source, source);
    finalSteps = reconciled.steps;
    finalSource = reconciled.source as typeof source;
  }

  const metrics = enrichActivity(
    finalSteps,
    profile.stride_length_cm,
    profile.height_cm,
    profile.weight_kg
  );

  const payload = {
    user_id: userId,
    date,
    steps: metrics.steps,
    distance_km: metrics.distance_km,
    calories: metrics.calories,
    active_minutes: metrics.active_minutes,
    source: finalSource,
  };

  const { data, error } = await supabase
    .from("daily_activity")
    .upsert(payload, { onConflict: "user_id,date" })
    .select()
    .single();
  if (error) throw error;
  return data as DailyActivity;
}

export async function addSteps(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
  additionalSteps: number,
  source: "manual" | "motion" = "manual"
): Promise<DailyActivity> {
  const today = toLocalDateString();
  const existing = await getDailyActivity(supabase, userId, today);
  const currentSteps = existing?.steps ?? 0;
  return upsertDailyActivity(supabase, userId, profile, today, currentSteps + additionalSteps, source);
}

export async function setSteps(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
  date: string,
  steps: number,
  source: "manual" | "import" = "manual"
): Promise<DailyActivity> {
  return upsertDailyActivity(supabase, userId, profile, date, steps, source);
}

export async function recordStepEvent(
  supabase: SupabaseClient,
  userId: string,
  steps: number,
  source: "manual" | "motion" | "import" = "motion"
) {
  const { error } = await supabase.from("step_events").insert({
    user_id: userId,
    steps,
    source,
    timestamp: new Date().toISOString(),
  });
  if (error) throw error;
}
