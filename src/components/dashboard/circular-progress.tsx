"use client";

import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  goalLabel?: string;
  className?: string;
}

export function CircularProgress({
  value,
  size = 240,
  strokeWidth = 12,
  label,
  sublabel,
  goalLabel,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--card-elevated)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {label && <span className="text-accent text-sm font-medium mb-1">{label}</span>}
        {sublabel && (
          <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
            {sublabel}
          </span>
        )}
        {goalLabel && <span className="text-muted text-sm mt-1">{goalLabel}</span>}
      </div>
    </div>
  );
}
