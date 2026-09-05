import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadHomePageData } from "@/lib/home/server";
import { STREAK_LOOKBACK_DAYS } from "@/lib/home/constants";
import { subtractDaysFromDateString } from "@/utils/date";

const userId = "user-1";
const today = "2026-09-05";

function activityRow(date: string, steps: number) {
  return {
    id: date,
    user_id: userId,
    date,
    steps,
    distance_km: 0,
    calories: 0,
    active_minutes: 0,
    source: "manual",
    created_at: "",
    updated_at: "",
  };
}

function createMockSupabase(options: {
  streakActivities?: Array<{ date: string; steps: number }>;
  todaySteps?: number | null;
}) {
  const profile = {
    user_id: userId,
    timezone: "UTC",
    daily_step_goal: 6000,
    display_name: "Test",
  };

  const capturedRangeStarts: string[] = [];

  const supabase = {
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: profile, error: null }) }),
          }),
        };
      }
      if (table === "app_settings") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { user_id: userId, week_starts_on: 0, distance_unit: "km" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "daily_activity") {
        return {
          select: () => ({
            eq: (_col: string, _val: string) => ({
              eq: (_col2: string, dateVal: string) => ({
                maybeSingle: async () => {
                  if (options.todaySteps != null && dateVal === today) {
                    return {
                      data: activityRow(today, options.todaySteps),
                      error: null,
                    };
                  }
                  return { data: null, error: null };
                },
              }),
              gte: (_col2: string, startDate: string) => {
                capturedRangeStarts.push(startDate);
                return {
                  lte: () => ({
                    order: async () => ({
                      data: (options.streakActivities ?? []).map((row) =>
                        activityRow(row.date, row.steps)
                      ),
                      error: null,
                    }),
                  }),
                };
              },
            }),
          }),
        };
      }
      if (table === "challenge_members") {
        return { select: () => ({ eq: () => ({ data: [], error: null }) }) };
      }
      if (table === "challenges") {
        return {
          select: () => ({
            eq: () => ({ data: [], error: null }),
            in: () => ({ data: [], error: null }),
          }),
        };
      }
      if (table === "challenge_leaderboard") {
        return {
          select: () => ({
            eq: () => ({ order: async () => ({ data: [], error: null }) }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    _capturedRangeStarts: capturedRangeStarts,
  };

  return supabase as unknown as SupabaseClient & { _capturedRangeStarts: string[] };
}

describe("loadHomePageData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches profile, settings, streak window, period ranges, and leaderboard in parallel", async () => {
    const supabase = createMockSupabase({ streakActivities: [], todaySteps: 0 });
    const data = await loadHomePageData(supabase, userId);

    expect(data.userId).toBe(userId);
    expect(data.today).toBe(today);
    expect(data.streak.currentStreak).toBe(0);
    expect(data.periodRanges).toHaveLength(3);
  });

  it(`caps streak lookback at ${STREAK_LOOKBACK_DAYS} days`, async () => {
    const streakStart = subtractDaysFromDateString(today, STREAK_LOOKBACK_DAYS);
    const activities = [
      { date: streakStart, steps: 7000 },
      { date: today, steps: 7000 },
    ];
    const supabase = createMockSupabase({ streakActivities: activities, todaySteps: 7000 });
    const data = await loadHomePageData(supabase, userId);

    const expectedStreakStart = subtractDaysFromDateString(today, STREAK_LOOKBACK_DAYS);
    expect(supabase._capturedRangeStarts).toContain(expectedStreakStart);
    expect(data.streakActivities.some((row) => row.date === streakStart)).toBe(true);
    expect(data.streak.currentStreak).toBe(1);
  });

  it("returns zero streak for a user with no activity rows", async () => {
    const supabase = createMockSupabase({ streakActivities: [], todaySteps: null });
    const data = await loadHomePageData(supabase, userId);

    expect(data.streak.currentStreak).toBe(0);
    expect(data.streak.longestStreak).toBe(0);
    expect(data.todayActivity).toBeNull();
  });
});
