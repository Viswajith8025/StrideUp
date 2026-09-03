"use client";

import { cn } from "@/lib/utils";

type Period = "D" | "W" | "M";

interface PeriodToggleProps {
  value: Period;
  onChange: (period: Period) => void;
}

const periods: Period[] = ["D", "W", "M"];

export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  return (
    <div className="flex rounded-full bg-card p-1" role="tablist" aria-label="Time period">
      {periods.map((p) => (
        <button
          key={p}
          role="tab"
          aria-selected={value === p}
          onClick={() => onChange(p)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-semibold transition-all min-w-[2.5rem]",
            value === p
              ? "bg-card-elevated text-foreground shadow-sm ring-1 ring-border"
              : "text-muted"
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
