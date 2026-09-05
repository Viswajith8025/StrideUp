"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { MOTION, prefersReducedMotion } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  steps?: number;
  goalLabel?: string;
  className?: string;
  /** @deprecated use steps */
  sublabel?: string;
}

export function CircularProgress({
  value,
  size = 248,
  strokeWidth = 14,
  label,
  steps,
  goalLabel,
  className,
  sublabel,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const [displayPct, setDisplayPct] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const displayRef = useRef(0);
  const wasComplete = useRef(false);
  const mounted = useRef(false);

  const numericSteps =
    steps ??
    (sublabel
      ? Number(String(sublabel).replace(/,/g, "")) || 0
      : undefined);

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const from = mounted.current ? displayRef.current : 0;
    const to = clamped;
    mounted.current = true;

    if (reduce) {
      displayRef.current = to;
      const id = requestAnimationFrame(() => setDisplayPct(to));
      return () => cancelAnimationFrame(id);
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / MOTION.emphasis);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      displayRef.current = next;
      setDisplayPct(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  useEffect(() => {
    const complete = clamped >= 100;
    if (complete && !wasComplete.current) {
      wasComplete.current = true;
      if (!prefersReducedMotion()) {
        const startId = requestAnimationFrame(() => setCelebrating(true));
        const id = window.setTimeout(() => setCelebrating(false), MOTION.celebrate);
        return () => {
          cancelAnimationFrame(startId);
          clearTimeout(id);
        };
      }
    }
    if (!complete) wasComplete.current = false;
  }, [clamped]);

  const offset = circumference - (displayPct / 100) * circumference;
  const atZero = clamped === 0;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        celebrating && "ring-complete",
        className
      )}
      style={{ width: size, height: size }}
    >
      {celebrating && (
        <div
          className="goal-burst pointer-events-none absolute inset-[-8%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent) 0%, transparent 70%)",
          }}
          aria-hidden
        />
      )}
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          opacity={0.9}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={atZero ? "color-mix(in srgb, var(--accent) 28%, var(--border))" : "var(--accent)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        {label && (
          <span className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {label}
          </span>
        )}
        {numericSteps != null ? (
          <AnimatedNumber value={numericSteps} className="text-hero text-foreground" />
        ) : sublabel ? (
          <span className="text-hero text-foreground">{sublabel}</span>
        ) : null}
        {goalLabel && <span className="mt-2 text-sm text-muted">{goalLabel}</span>}
      </div>
    </div>
  );
}
