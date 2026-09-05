"use client";

import { Star, Carrot } from "lucide-react";

interface StatsRowProps {
  calories: number;
  distance: string;
  distanceUnit: string;
  activeMinutes: number;
}

export function StatsRow({ calories, distance, distanceUnit, activeMinutes }: StatsRowProps) {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      <div className="flex-shrink-0 rounded-2xl bg-card px-5 py-4 min-w-[5.5rem]">
        <div className="text-2xl font-bold tabular-nums">{calories}</div>
        <div className="text-muted text-xs">kcal</div>
      </div>
      <div className="flex-shrink-0 rounded-2xl bg-card px-5 py-4 min-w-[5.5rem]">
        <Star size={14} className="text-accent mb-1" />
        <div className="text-2xl font-bold tabular-nums">{distance}</div>
        <div className="text-muted text-xs">{distanceUnit}</div>
      </div>
      <div className="flex-shrink-0 rounded-2xl bg-card px-5 py-4 min-w-[5.5rem]">
        <Star size={14} className="text-accent mb-1" />
        <div className="text-2xl font-bold tabular-nums">{activeMinutes}</div>
        <div className="text-muted text-xs">min</div>
      </div>
      <div className="flex-shrink-0 rounded-2xl bg-card px-5 py-4 min-w-[5.5rem]">
        <Carrot size={16} className="text-orange-300 mb-2" />
        <div className="text-muted text-xs">Calori…</div>
      </div>
    </div>
  );
}
