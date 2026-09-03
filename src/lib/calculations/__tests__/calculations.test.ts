import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  calculateCalories,
  calculateActiveMinutes,
  calculateGoalPercentage,
  calculateDailyStreak,
  calculateWeeklyStats,
  estimateStrideLength,
  reconcileSteps,
} from "@/lib/calculations";
import type { DailyActivity } from "@/types/database";

describe("calculateDistance", () => {
  it("calculates distance from steps and stride", () => {
    expect(calculateDistance(1000, 76, null)).toBeCloseTo(0.76, 2);
  });

  it("estimates stride from height when not provided", () => {
    const dist = calculateDistance(1000, null, 175);
    expect(dist).toBeGreaterThan(0);
  });
});

describe("calculateCalories", () => {
  it("returns estimated calories", () => {
    expect(calculateCalories(5000, 70)).toBeGreaterThan(0);
  });
});

describe("calculateActiveMinutes", () => {
  it("estimates from steps", () => {
    expect(calculateActiveMinutes(1000)).toBe(10);
    expect(calculateActiveMinutes(0)).toBe(0);
  });
});

describe("calculateGoalPercentage", () => {
  it("clamps at 100", () => {
    expect(calculateGoalPercentage(7000, 6000)).toBe(100);
    expect(calculateGoalPercentage(3000, 6000)).toBe(50);
  });
});

describe("calculateDailyStreak", () => {
  it("counts consecutive goal days", () => {
    const activities: DailyActivity[] = [
      { id: "1", user_id: "u", date: "2026-09-03", steps: 7000, distance_km: 5, calories: 300, active_minutes: 70, source: "manual", created_at: "", updated_at: "" },
      { id: "2", user_id: "u", date: "2026-09-02", steps: 6500, distance_km: 5, calories: 300, active_minutes: 65, source: "manual", created_at: "", updated_at: "" },
    ];
    expect(calculateDailyStreak(activities, 6000, "2026-09-03")).toBe(2);
  });
});

describe("calculateWeeklyStats", () => {
  it("aggregates weekly data", () => {
    const activities: DailyActivity[] = [
      { id: "1", user_id: "u", date: "2026-09-01", steps: 5000, distance_km: 3, calories: 200, active_minutes: 50, source: "manual", created_at: "", updated_at: "" },
      { id: "2", user_id: "u", date: "2026-09-02", steps: 7000, distance_km: 5, calories: 300, active_minutes: 70, source: "manual", created_at: "", updated_at: "" },
    ];
    const stats = calculateWeeklyStats(activities, "2026-09-01", "2026-09-07", 6000);
    expect(stats.totalSteps).toBe(12000);
    expect(stats.bestDay?.steps).toBe(7000);
  });
});

describe("estimateStrideLength", () => {
  it("uses height ratio", () => {
    expect(estimateStrideLength(175)).toBeCloseTo(175 * 0.415, 1);
  });
});

describe("reconcileSteps", () => {
  it("prefers higher priority source", () => {
    expect(reconcileSteps(5000, 6000, "motion", "import")).toEqual({ steps: 6000, source: "import" });
  });
});
