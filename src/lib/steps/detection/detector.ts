/**
 * Pure, side-effect-free step detector.
 * No DOM, timers, or I/O — feed samples via push().
 */

export interface AccelSample {
  x: number;
  y: number;
  z: number;
  /** Event timestamp in ms (DeviceMotionEvent.timeStamp or performance.now). */
  t: number;
}

export interface StepDetectorConfig {
  /** Multiplier on adaptive threshold (higher → fewer false positives). Default 1. */
  sensitivity: number;
  /** EMA time-constant for gravity estimate (high-pass), ms. */
  highPassTauMs: number;
  /** EMA time-constant for noise smoothing (low-pass), ms. */
  lowPassTauMs: number;
  /** Rolling window for mean/stddev, ms. */
  windowMs: number;
  /** Peak must exceed mean + k·stddev. */
  kStd: number;
  /** Minimum time between accepted peaks, ms. */
  refractoryMs: number;
  /** Gap that breaks cadence and starts a new sequence, ms. */
  cadenceBreakMs: number;
  /** Consecutive in-cadence peaks required before counting. */
  warmupPeaks: number;
  /** Ignore samples for this long after first sample / reset, ms. */
  startupIgnoreMs: number;
  /** Valid inter-peak interval lower bound, ms. */
  minIntervalMs: number;
  /** Valid inter-peak interval upper bound, ms. */
  maxIntervalMs: number;
  /** Max relative deviation from recent mean interval to stay in cadence. */
  intervalTolerance: number;
  /** Minimum stddev floor so a flat signal does not produce tiny thresholds. */
  minStd: number;
}

export const DEFAULT_DETECTOR_CONFIG: StepDetectorConfig = {
  sensitivity: 1,
  highPassTauMs: 900,
  lowPassTauMs: 90,
  windowMs: 2500,
  kStd: 1.2,
  refractoryMs: 250,
  cadenceBreakMs: 2000,
  warmupPeaks: 4,
  startupIgnoreMs: 500,
  minIntervalMs: 280,
  maxIntervalMs: 1100,
  intervalTolerance: 0.32,
  minStd: 0.08,
};

export interface DetectorState {
  sampleCount: number;
  totalSteps: number;
  cadenceConfirmed: boolean;
  lastPeakT: number | null;
  lastIntervalMs: number | null;
  gravity: number;
  filtered: number;
  mean: number;
  std: number;
  startedAt: number | null;
}

export interface StepDetector {
  push(sample: AccelSample): number;
  reset(): void;
  readonly state: DetectorState;
  readonly config: StepDetectorConfig;
}

/** Alpha for an EMA given dt and time-constant τ (same units). */
export function emaAlpha(dt: number, tau: number): number {
  if (tau <= 0 || dt <= 0) return 1;
  return 1 - Math.exp(-dt / tau);
}

export function magnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

interface WindowPoint {
  t: number;
  v: number;
}

export function meanStd(values: number[], minStd: number): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: minStd };
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / values.length;
  let varSum = 0;
  for (const v of values) {
    const d = v - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / values.length);
  return { mean, std: Math.max(std, minStd) };
}

export function createStepDetector(
  partial: Partial<StepDetectorConfig> = {}
): StepDetector {
  const config: StepDetectorConfig = { ...DEFAULT_DETECTOR_CONFIG, ...partial };

  let sampleCount = 0;
  let totalSteps = 0;
  let lastT: number | null = null;
  let startedAt: number | null = null;
  let gravity = 0;
  let gravityInit = false;
  let filtered = 0;
  let filterInit = false;

  let prevFiltered = 0;
  let prevPrevFiltered = 0;
  let prevT: number | null = null;
  let havePrev = false;
  let havePrevPrev = false;

  const window: WindowPoint[] = [];
  let mean = 0;
  let std = config.minStd;

  let lastAcceptedPeakT: number | null = null;
  let lastIntervalMs: number | null = null;
  let cadenceConfirmed = false;
  let pendingPeaks: number[] = [];
  let recentIntervals: number[] = [];

  function pruneWindow(now: number) {
    const cutoff = now - config.windowMs;
    while (window.length && window[0]!.t < cutoff) window.shift();
  }

  function updateStats(now: number, value: number) {
    window.push({ t: now, v: value });
    pruneWindow(now);
    const stats = meanStd(
      window.map((p) => p.v),
      config.minStd
    );
    mean = stats.mean;
    std = stats.std;
  }

  function meanInterval(): number | null {
    if (!recentIntervals.length) return null;
    return recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length;
  }

  function breakCadence() {
    cadenceConfirmed = false;
    pendingPeaks = [];
    recentIntervals = [];
  }

  function acceptPeak(peakT: number): number {
    if (lastAcceptedPeakT != null && peakT - lastAcceptedPeakT < config.refractoryMs) {
      return 0;
    }

    if (lastAcceptedPeakT == null || peakT - lastAcceptedPeakT > config.cadenceBreakMs) {
      breakCadence();
      pendingPeaks = [peakT];
      lastAcceptedPeakT = peakT;
      lastIntervalMs = null;
      return 0;
    }

    const interval = peakT - lastAcceptedPeakT;
    lastAcceptedPeakT = peakT;
    lastIntervalMs = interval;

    if (interval < config.minIntervalMs || interval > config.maxIntervalMs) {
      breakCadence();
      pendingPeaks = [peakT];
      return 0;
    }

    const mi = meanInterval();
    if (mi != null) {
      const rel = Math.abs(interval - mi) / mi;
      if (rel > config.intervalTolerance) {
        breakCadence();
        pendingPeaks = [peakT];
        return 0;
      }
    }

    recentIntervals.push(interval);
    if (recentIntervals.length > 6) recentIntervals.shift();

    if (!cadenceConfirmed) {
      pendingPeaks.push(peakT);
      if (pendingPeaks.length >= config.warmupPeaks) {
        cadenceConfirmed = true;
        const credited = pendingPeaks.length;
        pendingPeaks = [];
        return credited;
      }
      return 0;
    }

    return 1;
  }

  function push(sample: AccelSample): number {
    const { x, y, z, t } = sample;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(t)) {
      return 0;
    }

    if (lastT != null) {
      if (t < lastT) return 0;
      if (t === lastT) return 0;
    }

    const m = magnitude(x, y, z);
    sampleCount += 1;

    if (startedAt == null) {
      startedAt = t;
      gravity = m;
      gravityInit = true;
      filtered = 0;
      filterInit = true;
      lastT = t;
      prevFiltered = 0;
      prevT = t;
      havePrev = true;
      return 0;
    }

    const dt = t - lastT!;

    // Large gap between samples ⇒ sensor pause / visibility hole — reset cadence, do not invent steps
    if (dt > config.cadenceBreakMs) {
      breakCadence();
      lastAcceptedPeakT = null;
      lastIntervalMs = null;
    }

    const dtClamped = Math.min(Math.max(dt, 1), 250);

    if (!gravityInit) {
      gravity = m;
      gravityInit = true;
    } else {
      const aG = emaAlpha(dtClamped, config.highPassTauMs);
      gravity = gravity + aG * (m - gravity);
    }

    const highPassed = m - gravity;

    if (!filterInit) {
      filtered = highPassed;
      filterInit = true;
    } else {
      const aL = emaAlpha(dtClamped, config.lowPassTauMs);
      filtered = filtered + aL * (highPassed - filtered);
    }

    updateStats(t, filtered);

    let steps = 0;
    const inStartup = t - startedAt < config.startupIgnoreMs;

    if (!inStartup && havePrevPrev && havePrev && prevT != null) {
      const isPeak = prevPrevFiltered < prevFiltered && prevFiltered >= filtered;
      if (isPeak) {
        const peakValue = prevFiltered;
        const threshold =
          mean + (config.kStd * std) / Math.max(0.25, config.sensitivity);
        if (peakValue >= threshold && peakValue >= mean + config.minStd) {
          const credited = acceptPeak(prevT);
          steps = credited;
          totalSteps += credited;
        }
      }
    }

    prevPrevFiltered = prevFiltered;
    havePrevPrev = havePrev;
    prevFiltered = filtered;
    prevT = t;
    havePrev = true;
    lastT = t;

    return steps;
  }

  function reset() {
    sampleCount = 0;
    totalSteps = 0;
    lastT = null;
    startedAt = null;
    gravity = 0;
    gravityInit = false;
    filtered = 0;
    filterInit = false;
    prevFiltered = 0;
    prevPrevFiltered = 0;
    prevT = null;
    havePrev = false;
    havePrevPrev = false;
    window.length = 0;
    mean = 0;
    std = config.minStd;
    lastAcceptedPeakT = null;
    lastIntervalMs = null;
    cadenceConfirmed = false;
    pendingPeaks = [];
    recentIntervals = [];
  }

  return {
    push,
    reset,
    config,
    get state(): DetectorState {
      return {
        sampleCount,
        totalSteps,
        cadenceConfirmed,
        lastPeakT: lastAcceptedPeakT,
        lastIntervalMs,
        gravity,
        filtered,
        mean,
        std,
        startedAt,
      };
    },
  };
}
