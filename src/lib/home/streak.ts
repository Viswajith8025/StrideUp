import type { DailyActivity } from "@/types/database";
import {
  calculateDailyStreak,
  calculateLongestStreak,
  getGoalHitMap,
  type GoalHitDay,
} from "@/lib/calculations";
import { subtractDaysFromDateString } from "@/utils/date";
import { STREAK_LOOKBACK_DAYS } from "./constants";

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  goalHits: GoalHitDay[];
}

export function computeStreakSummary(
  activities: DailyActivity[],
  goal: number,
  today: string
): StreakSummary {
  const rangeStart = subtractDaysFromDateString(today, STREAK_LOOKBACK_DAYS);
  return {
    currentStreak: calculateDailyStreak(activities, goal, today),
    longestStreak: calculateLongestStreak(activities, goal, rangeStart, today),
    goalHits: getGoalHitMap(activities, goal, today, 7),
  };
}
