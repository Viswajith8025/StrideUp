import type { AccelSample } from "./detector";

export interface MotionTrace {
  name: string;
  label: string;
  /** Ground-truth step count when known; null if unknown. */
  trueSteps: number | null;
  /** If true, detector should count ≈ 0. */
  expectNearZero: boolean;
  /** Allowed relative error on walking traces (0.2 = ±20%). */
  tolerancePct: number;
  sampleRateHz: number;
  notes?: string;
  samples: AccelSample[];
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise(rand: () => number, amp: number) {
  return (rand() * 2 - 1) * amp;
}

/** Synthetic walking: periodic vertical bounce at `stepsPerSec` with gravity. */
export function synthesizeWalking(opts: {
  name: string;
  label: string;
  steps: number;
  stepsPerSec: number;
  sampleRateHz?: number;
  amplitude?: number;
  seed?: number;
  phoneInPocket?: boolean;
  tolerancePct?: number;
}): MotionTrace {
  const sampleRateHz = opts.sampleRateHz ?? 50;
  const amplitude = opts.amplitude ?? (opts.phoneInPocket ? 3.5 : 2.8);
  const rand = mulberry32(opts.seed ?? 42);
  const dt = 1000 / sampleRateHz;
  const durationMs = (opts.steps / opts.stepsPerSec) * 1000 + 800;
  const samples: AccelSample[] = [];

  // Startup garbage
  for (let t = 0; t < 400; t += dt) {
    samples.push({
      x: noise(rand, 3),
      y: noise(rand, 3),
      z: 9.81 + noise(rand, 3),
      t,
    });
  }

  const start = 500;
  for (let t = start; t < start + durationMs; t += dt) {
    const phase = (2 * Math.PI * opts.stepsPerSec * (t - start)) / 1000;
    // One peak per step via raised cosine on vertical axis
    const bounce = amplitude * Math.max(0, Math.sin(phase));
    const sway = opts.phoneInPocket ? 0.6 * Math.sin(phase * 0.5) : 0.25 * Math.sin(phase * 0.5);

    let x = sway + noise(rand, 0.15);
    let y = noise(rand, 0.12);
    let z = 9.81 + bounce + noise(rand, 0.15);

    if (opts.phoneInPocket) {
      // Rotate gravity toward Y (phone upright in pocket)
      const g = 9.81 + bounce;
      x = 0.4 * g + sway + noise(rand, 0.2);
      y = 0.9 * g + noise(rand, 0.2);
      z = 0.2 * g + noise(rand, 0.2);
    }

    samples.push({ x, y, z, t });
  }

  return {
    name: opts.name,
    label: opts.label,
    trueSteps: opts.steps,
    expectNearZero: false,
    tolerancePct: opts.tolerancePct ?? 0.2,
    sampleRateHz,
    notes: "Synthetic biomechanical walk (committed as fixture until real device traces replace it).",
    samples,
  };
}

export function synthesizeStill(opts?: { durationMs?: number; seed?: number }): MotionTrace {
  const rand = mulberry32(opts?.seed ?? 7);
  const durationMs = opts?.durationMs ?? 12000;
  const dt = 20;
  const samples: AccelSample[] = [];
  for (let t = 0; t < durationMs; t += dt) {
    samples.push({
      x: noise(rand, 0.04),
      y: noise(rand, 0.04),
      z: 9.81 + noise(rand, 0.04),
      t,
    });
  }
  return {
    name: "sitting-still",
    label: "Sitting still",
    trueSteps: 0,
    expectNearZero: true,
    tolerancePct: 0,
    sampleRateHz: 50,
    samples,
  };
}

export function synthesizeScrolling(opts?: { durationMs?: number; seed?: number }): MotionTrace {
  const rand = mulberry32(opts?.seed ?? 11);
  const durationMs = opts?.durationMs ?? 10000;
  const dt = 16;
  const samples: AccelSample[] = [];
  for (let t = 0; t < durationMs; t += dt) {
    // Irregular taps / flicks — high frequency, no stable cadence
    const flick = rand() > 0.92 ? noise(rand, 2.2) : noise(rand, 0.25);
    samples.push({
      x: flick + noise(rand, 0.2),
      y: noise(rand, 0.3),
      z: 9.81 + noise(rand, 0.2),
      t,
    });
  }
  return {
    name: "scrolling-hand",
    label: "Phone in hand while scrolling",
    trueSteps: 0,
    expectNearZero: true,
    tolerancePct: 0,
    sampleRateHz: 60,
    samples,
  };
}

export function synthesizeVehicle(opts?: { durationMs?: number; seed?: number }): MotionTrace {
  const rand = mulberry32(opts?.seed ?? 19);
  const durationMs = opts?.durationMs ?? 15000;
  const dt = 20;
  const samples: AccelSample[] = [];
  for (let t = 0; t < durationMs; t += dt) {
    // Slow sway ~0.4Hz, no step-like peaks
    const sway = 1.4 * Math.sin((2 * Math.PI * 0.35 * t) / 1000);
    const bump = rand() > 0.985 ? noise(rand, 1.5) : 0;
    samples.push({
      x: sway + bump + noise(rand, 0.1),
      y: 0.3 * sway + noise(rand, 0.1),
      z: 9.81 + 0.2 * sway + noise(rand, 0.1),
      t,
    });
  }
  return {
    name: "vehicle",
    label: "Riding in a vehicle",
    trueSteps: 0,
    expectNearZero: true,
    tolerancePct: 0,
    sampleRateHz: 50,
    samples,
  };
}

export function synthesizeStairs(opts?: { steps?: number; seed?: number }): MotionTrace {
  return synthesizeWalking({
    name: "climbing-stairs",
    label: "Climbing stairs",
    steps: opts?.steps ?? 28,
    stepsPerSec: 1.5,
    amplitude: 3.4,
    seed: opts?.seed ?? 31,
    tolerancePct: 0.25,
  });
}
