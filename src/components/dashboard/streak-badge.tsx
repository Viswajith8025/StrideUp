"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalHitDay } from "@/lib/calculations";
import { getDayLabel, toLocalDateString } from "@/utils/date";

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
  const today = toLocalDateString();
  const live = currentStreak > 0;

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
        "surface-raised flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl px-4 py-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            live ? "bg-orange-400/15 text-orange-400" : "bg-card-elevated text-muted"
          )}
        >
          <Flame
            size={20}
            strokeWidth={1.75}
            className={cn(!reduceMotion && live && "streak-flame")}
            aria-hidden
          />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums leading-none">{currentStreak}</span>
            <span className="text-sm text-muted">day streak</span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Best {longestStreak} · {live ? "Keep it going" : "Hit today’s goal to start"}
          </p>
        </div>
      </div>

      <div
        className="flex w-full items-end justify-between gap-1"
        aria-label="Last 7 days goal progress"
      >
        {goalHits.map((day, index) => {
          const isToday = day.date === today;
          const label = getDayLabel(day.date).slice(0, 2);
          return (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center gap-1.5"
              style={
                !reduceMotion
                  ? { animationDelay: `${index * 50}ms` }
                  : undefined
              }
            >
              <span
                title={day.date}
                className={cn(
                  "streak-dot h-3 w-3 rounded-full border transition-colors",
                  day.hit
                    ? "border-orange-400 bg-orange-400"
                    : "border-border bg-transparent",
                  isToday && !day.hit && "border-accent ring-2 ring-accent/30",
                  isToday && day.hit && "ring-2 ring-orange-400/40",
                  !reduceMotion && "animate-rise"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium uppercase",
                  isToday ? "text-accent" : "text-muted"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
