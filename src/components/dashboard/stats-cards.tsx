"use client";

import { MapPin, Timer, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsRowProps {
  calories: number;
  distance: string;
  distanceUnit: string;
  activeMinutes: number;
}

function StatCard({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: typeof MapPin;
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-raised flex min-w-0 flex-1 flex-col gap-2 rounded-2xl px-3 py-3.5",
        className
      )}
    >
      <Icon size={16} strokeWidth={1.75} className="text-muted" aria-hidden />
      <div className="text-xl font-semibold tabular-nums tracking-tight text-foreground truncate">
        {value}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted truncate">
        {label}
      </div>
    </div>
  );
}

export function StatsRow({ calories, distance, distanceUnit, activeMinutes }: StatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <StatCard icon={MapPin} value={distance} label={distanceUnit} />
      <StatCard icon={Timer} value={activeMinutes} label="Active min" />
      <StatCard icon={Flame} value={calories} label="kcal" />
    </div>
  );
}
