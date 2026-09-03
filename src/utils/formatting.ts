import type { DistanceUnit, WeightUnit } from "@/types/database";

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(Math.round(n));
}

export function formatSteps(steps: number): string {
  return formatNumber(steps);
}

export function formatDistance(km: number, unit: DistanceUnit): string {
  if (unit === "mi") {
    const miles = km * 0.621371;
    return miles < 10 ? miles.toFixed(1) : Math.round(miles).toString();
  }
  return km < 10 ? km.toFixed(1) : Math.round(km).toString();
}

export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit;
}

export function formatWeight(kg: number | null, unit: WeightUnit): string {
  if (kg == null) return "—";
  if (unit === "lb") return `${Math.round(kg * 2.20462)} lb`;
  return `${kg} kg`;
}

export function formatHeight(cm: number | null): string {
  if (cm == null) return "—";
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percentLabel(value: number): string {
  return `${Math.round(value)}%`;
}
