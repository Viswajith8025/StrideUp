"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalHitDay } from "@/lib/calculations";

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  goalHits: GoalHitDay[];
  className?: string;
}

export function StreakBadge({
  currentStreak,
  longestStreak,
  goalHits,
  className,
}: StreakBadgeProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div
      className={cn(
        "flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-card px-4 py-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Flame
          size={20}
          className={cn(
            "text-orange-400",
            !reduceMotion && currentStreak > 0 && "animate-pulse"
          )}
        />
        <div className="text-center">
          <div className="text-2xl font-bold tabular-nums leading-none">{currentStreak}</div>
          <div className="text-xs text-muted">day streak</div>
        </div>
        <div className="ml-4 text-center">
          <div className="text-sm font-semibold tabular-nums leading-none">{longestStreak}</div>
          <div className="text-[10px] text-muted">best</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5" aria-label="Last 7 days goal progress">
        {goalHits.map((day) => (
          <span
            key={day.date}
            title={day.date}
            className={cn(
              "h-2.5 w-2.5 rounded-full border border-muted/40",
              day.hit ? "bg-orange-400" : "bg-transparent",
              !reduceMotion && day.hit && "transition-colors duration-300"
            )}
          />
        ))}
      </div>
    </div>
  );
}
