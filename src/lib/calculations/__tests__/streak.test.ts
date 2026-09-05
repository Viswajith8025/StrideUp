import { describe, it, expect } from "vitest";
import {
  calculateDailyStreak,
  calculateLongestStreak,
  getGoalHitMap,
} from "@/lib/calculations";
import { toDateStringInTimezone } from "@/utils/date";
import type { DailyActivity } from "@/types/database";

function activity(date: string, steps: number): DailyActivity {
  return {
    id: date,
    user_id: "u",
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

const GOAL = 6000;

describe("calculateDailyStreak timezone-aware", () => {
  it("holds streak when today is incomplete (does not increment)", () => {
    const activities = [
      activity("2026-09-03", 7000),
      activity("2026-09-02", 6500),
      activity("2026-09-01", 6200),
    ];
    expect(calculateDailyStreak(activities, GOAL, "2026-09-04")).toBe(3);
  });

  it("breaks streak after a gap day", () => {
    const activities = [
      activity("2026-09-04", 7000),
      activity("2026-09-02", 6500),
    ];
    expect(calculateDailyStreak(activities, GOAL, "2026-09-04")).toBe(1);
  });

  it("returns zero for a user with no history", () => {
    expect(calculateDailyStreak([], GOAL, "2026-09-04")).toBe(0);
  });

  it("survives a DST boundary using timezone-local dates", () => {
    const activities = [
      activity("2026-03-07", 7000),
      activity("2026-03-08", 7000),
      activity("2026-03-09", 7000),
    ];
    const instant = new Date("2026-03-09T12:00:00.000Z");
    const today = toDateStringInTimezone(instant, "America/New_York");
    expect(calculateDailyStreak(activities, GOAL, today)).toBe(3);
  });

  it("survives a timezone change mid-streak when dates are stored in local calendar", () => {
    const activities = [
      activity("2026-09-01", 7000),
      activity("2026-09-02", 7000),
      activity("2026-09-03", 7000),
    ];
    const instant = new Date("2026-09-03T20:00:00.000Z");
    const nyToday = toDateStringInTimezone(instant, "America/New_York");
    const kolkataToday = toDateStringInTimezone(instant, "Asia/Kolkata");

    expect(calculateDailyStreak(activities, GOAL, nyToday)).toBe(3);
    expect(calculateDailyStreak(activities, GOAL, kolkataToday)).toBe(3);
  });
});

describe("calculateLongestStreak", () => {
  it("finds the longest run in range", () => {
    const activities = [
      activity("2026-09-01", 7000),
      activity("2026-09-02", 7000),
      activity("2026-09-03", 1000),
      activity("2026-09-04", 7000),
      activity("2026-09-05", 7000),
    ];
    expect(calculateLongestStreak(activities, GOAL, "2026-09-01", "2026-09-05")).toBe(2);
  });
});

describe("getGoalHitMap", () => {
  it("returns seven days ending at endDate", () => {
    const activities = [activity("2026-09-03", 7000)];
    const map = getGoalHitMap(activities, GOAL, "2026-09-03", 7);
    expect(map).toHaveLength(7);
    expect(map[6]).toEqual({ date: "2026-09-03", hit: true });
    expect(map[0].hit).toBe(false);
  });
});
