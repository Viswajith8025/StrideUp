import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyActivity, LeaderboardEntry, Profile } from "@/types/database";
import { getChallenges, getLeaderboard } from "@/lib/challenges/service";
import { getActivityRange, getDailyActivity } from "@/lib/steps/service";
import {
  getMonthRange,
  getWeekRange,
  parseLocalDate,
  subtractDaysFromDateString,
  toDateStringInTimezone,
} from "@/utils/date";
import { STREAK_LOOKBACK_DAYS } from "./constants";
import { computeStreakSummary } from "./streak";
import { rangeKey, type HomePageData, type HomeRangeCache } from "./types";

async function loadLeaderboard(
  supabase: SupabaseClient,
  userId: string
): Promise<{ leaderboard: LeaderboardEntry[]; activeChallengeId: string | null }> {
  const challenges = await getChallenges(supabase, userId);
  const active = challenges.find((c) => c.status === "active");
  if (!active) {
    return { leaderboard: [], activeChallengeId: null };
  }
  const leaderboard = await getLeaderboard(supabase, active.id);
  return { leaderboard, activeChallengeId: active.id };
}

export async function loadHomePageData(
  supabase: SupabaseClient,
  userId: string
): Promise<HomePageData> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (profileError || !profile) throw profileError ?? new Error("Profile not found");

  const timezone = profile.timezone ?? "UTC";
  const today = toDateStringInTimezone(new Date(), timezone);
  const goal = profile.daily_step_goal ?? 6000;
  const weekStartsOn = 0;

  const weekRange = getWeekRange(parseLocalDate(today), weekStartsOn);
  const monthRange = getMonthRange(parseLocalDate(today));
  const streakStart = subtractDaysFromDateString(today, STREAK_LOOKBACK_DAYS);

  const [
    settingsResult,
    todayActivity,
    streakActivities,
    dayActivities,
    weekActivities,
    monthActivities,
    leaderboardBundle,
  ] = await Promise.all([
    supabase.from("app_settings").select("*").eq("user_id", userId).single(),
    getDailyActivity(supabase, userId, today),
    getActivityRange(supabase, userId, streakStart, today),
    getActivityRange(supabase, userId, today, today),
    getActivityRange(supabase, userId, weekRange.start, weekRange.end),
    getActivityRange(supabase, userId, monthRange.start, monthRange.end),
    loadLeaderboard(supabase, userId),
  ]);

  if (settingsResult.error || !settingsResult.data) {
    throw settingsResult.error ?? new Error("App settings not found");
  }

  const { leaderboard, activeChallengeId } = leaderboardBundle;
  const streak = computeStreakSummary(streakActivities, goal, today);

  const periodRanges: HomeRangeCache[] = [
    {
      key: rangeKey("D", today, today),
      start: today,
      end: today,
      activities: dayActivities,
    },
    {
      key: rangeKey("W", weekRange.start, weekRange.end),
      start: weekRange.start,
      end: weekRange.end,
      activities: weekActivities,
    },
    {
      key: rangeKey("M", monthRange.start, monthRange.end),
      start: monthRange.start,
      end: monthRange.end,
      activities: monthActivities,
    },
  ];

  return {
    userId,
    profile: profile as Profile,
    settings: settingsResult.data,
    today,
    goal,
    todayActivity,
    streak,
    streakActivities,
    periodRanges,
    leaderboard,
    activeChallengeId,
  };
}
