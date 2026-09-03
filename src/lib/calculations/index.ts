import type { DailyActivity } from "@/types/database";
import { getDaysInRange } from "@/utils/date";

const DEFAULT_STRIDE_CM = 76;
const HEIGHT_STRIDE_RATIO = 0.415;

/** Estimate stride length from height in cm */
export function estimateStrideLength(heightCm: number | null): number {
  if (heightCm && heightCm > 0) {
    return heightCm * HEIGHT_STRIDE_RATIO;
  }
  return DEFAULT_STRIDE_CM;
}

export function getEffectiveStrideLength(
  strideLengthCm: number | null,
  heightCm: number | null
): number {
  if (strideLengthCm && strideLengthCm > 0) return strideLengthCm;
  return estimateStrideLength(heightCm);
}

/** Distance in km from steps */
export function calculateDistance(
  steps: number,
  strideLengthCm: number | null,
  heightCm: number | null
): number {
  const strideM = getEffectiveStrideLength(strideLengthCm, heightCm) / 100;
  return (steps * strideM) / 1000;
}

/**
 * Estimated calories burned from walking.
 * Uses MET-based estimate — not medical grade.
 */
export function calculateCalories(
  steps: number,
  weightKg: number | null,
  activeMinutes?: number
): number {
  const weight = weightKg && weightKg > 0 ? weightKg : 70;
  if (activeMinutes && activeMinutes > 0) {
    // Walking MET ~3.5
    return Math.round((3.5 * weight * activeMinutes) / 200);
  }
  // Fallback: ~0.04 kcal per step for average adult
  return Math.round(steps * 0.04 * (weight / 70));
}

/** Estimate active minutes from steps (brisk walking ~100 steps/min) */
export function calculateActiveMinutes(steps: number): number {
  if (steps <= 0) return 0;
  return Math.max(1, Math.round(steps / 100));
}

export function calculateGoalPercentage(steps: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, (steps / goal) * 100);
}

export function calculateDailyStreak(
  activities: DailyActivity[],
  goal: number,
  todayStr: string
): number {
  const byDate = new Map(activities.map((a) => [a.date, a.steps]));
  let streak = 0;
  const current = new Date(
    parseInt(todayStr.slice(0, 4)),
    parseInt(todayStr.slice(5, 7)) - 1,
    parseInt(todayStr.slice(8, 10))
  );

  while (true) {
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    const steps = byDate.get(dateStr) ?? 0;
    if (steps >= goal) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export interface WeeklyStats {
  totalSteps: number;
  averageSteps: number;
  bestDay: { date: string; steps: number } | null;
  goalCompletionRate: number;
  dailyData: { date: string; steps: number; label: string }[];
}

export function calculateWeeklyStats(
  activities: DailyActivity[],
  startDate: string,
  endDate: string,
  goal: number
): WeeklyStats {
  const days = getDaysInRange(startDate, endDate);
  const byDate = new Map(activities.map((a) => [a.date, a.steps]));
  const dailyData = days.map((date) => ({
    date,
    steps: byDate.get(date) ?? 0,
    label: date.slice(8),
  }));
  const totalSteps = dailyData.reduce((s, d) => s + d.steps, 0);
  const daysWithGoal = dailyData.filter((d) => d.steps >= goal).length;
  const best = dailyData.reduce<{ date: string; steps: number } | null>((b, d) => {
    if (!b || d.steps > b.steps) return { date: d.date, steps: d.steps };
    return b;
  }, null);

  return {
    totalSteps,
    averageSteps: days.length ? Math.round(totalSteps / days.length) : 0,
    bestDay: best && best.steps > 0 ? best : null,
    goalCompletionRate: days.length ? (daysWithGoal / days.length) * 100 : 0,
    dailyData,
  };
}

export function calculateMonthlyStats(
  activities: DailyActivity[],
  startDate: string,
  endDate: string,
  goal: number
): WeeklyStats {
  return calculateWeeklyStats(activities, startDate, endDate, goal);
}

export function enrichActivity(
  steps: number,
  strideLengthCm: number | null,
  heightCm: number | null,
  weightKg: number | null
) {
  const activeMinutes = calculateActiveMinutes(steps);
  return {
    steps,
    distance_km: calculateDistance(steps, strideLengthCm, heightCm),
    calories: calculateCalories(steps, weightKg, activeMinutes),
    active_minutes: activeMinutes,
  };
}

/** Reconcile: take max steps per source priority import > manual > motion */
export function reconcileSteps(
  existing: number,
  incoming: number,
  existingSource: string,
  incomingSource: string
): { steps: number; source: string } {
  const priority: Record<string, number> = { import: 3, manual: 2, motion: 1, reconciled: 2 };
  const existingP = priority[existingSource] ?? 0;
  const incomingP = priority[incomingSource] ?? 0;

  if (incoming > existing || incomingP > existingP) {
    return { steps: Math.max(existing, incoming), source: incomingP >= existingP ? incomingSource : existingSource };
  }
  return { steps: existing, source: existingSource };
}
