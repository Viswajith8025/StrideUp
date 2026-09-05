"use client";

import { useEffect, useRef, useState } from "react";
import { MOTION, prefersReducedMotion } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  durationMs?: number;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className,
  durationMs = MOTION.emphasis,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const from = mountedRef.current ? prevRef.current : 0;
    const to = value;
    prevRef.current = value;
    mountedRef.current = true;

    if (prefersReducedMotion() || from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const delta = to - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(from + delta * easeOutCubic(t));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs]);

  return (
    <span className={cn("tabular-nums", className)} aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
