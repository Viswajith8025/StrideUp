"use client";

import { cn } from "@/lib/utils";
import type { MotionLiveStatus } from "@/hooks/useSteps";

const LABELS: Record<MotionLiveStatus, string> = {
  unsupported: "Motion unsupported",
  denied: "Motion denied",
  prompt: "Tap to enable motion",
  idle: "Motion idle",
  counting: "Counting (while open)",
  paused: "Paused — tab hidden",
  walk: "Walk mode — screen awake",
};

export function MotionStatusPill({
  status,
  className,
}: {
  status: MotionLiveStatus;
  className?: string;
}) {
  const tone =
    status === "counting" || status === "walk"
      ? "border-accent/30 bg-accent/10 text-accent"
      : status === "denied" || status === "unsupported"
        ? "border-red-500/30 bg-red-500/10 text-red-400"
        : status === "paused"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
          : "border-border bg-card text-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tone,
        className
      )}
      role="status"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "counting" || status === "walk"
            ? "bg-accent"
            : status === "paused"
              ? "bg-amber-400"
              : status === "denied" || status === "unsupported"
                ? "bg-red-400"
                : "bg-muted"
        )}
        aria-hidden
      />
      {LABELS[status]}
    </span>
  );
}
