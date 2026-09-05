/** Shared motion vocabulary — keep in sync with globals.css tokens. */
export const MOTION = {
  instant: 80,
  fast: 150,
  standard: 260,
  emphasis: 420,
  celebrate: 700,
  stagger: 50,
} as const;

export const EASE = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOut: "cubic-bezier(0.45, 0, 0.55, 1)",
  spring: "cubic-bezier(0.34, 1.4, 0.64, 1)",
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
