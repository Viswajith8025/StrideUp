import type {
  AppSettings,
  DailyActivity,
  LeaderboardEntry,
  Profile,
} from "@/types/database";
import type { StreakSummary } from "./streak";
import { getMonthRange, getWeekRange, parseLocalDate } from "@/utils/date";

export type HomePeriod = "D" | "W" | "M";

export interface HomeRangeCache {
  key: string;
  start: string;
  end: string;
  activities: DailyActivity[];
}

export interface HomePageData {
  userId: string;
  profile: Profile;
  settings: AppSettings;
  today: string;
  goal: number;
  todayActivity: DailyActivity | null;
  streak: StreakSummary;
  streakActivities: DailyActivity[];
  periodRanges: HomeRangeCache[];
  leaderboard: LeaderboardEntry[];
  activeChallengeId: string | null;
}

function rangeKey(period: HomePeriod, start: string, end: string) {
  return `${period}:${start}:${end}`;
}

export function resolveActivityRange(
  period: HomePeriod,
  selectedDate: string,
  weekStartsOn: number
): { start: string; end: string; key: string } {
  if (period === "D") {
    return { start: selectedDate, end: selectedDate, key: rangeKey("D", selectedDate, selectedDate) };
  }
  if (period === "W") {
    const range = getWeekRange(parseLocalDate(selectedDate), weekStartsOn);
    return {
      start: range.start,
      end: range.end,
      key: rangeKey("W", range.start, range.end),
    };
  }
  const range = getMonthRange(parseLocalDate(selectedDate));
  return {
    start: range.start,
    end: range.end,
    key: rangeKey("M", range.start, range.end),
  };
}

export { rangeKey };
