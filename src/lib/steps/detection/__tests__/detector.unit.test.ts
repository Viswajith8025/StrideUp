import { describe, expect, it } from "vitest";
import {
  createStepDetector,
  emaAlpha,
  magnitude,
  meanStd,
  DEFAULT_DETECTOR_CONFIG,
} from "../detector";

describe("emaAlpha", () => {
  it("returns 1 for non-positive tau or dt", () => {
    expect(emaAlpha(0, 100)).toBe(1);
    expect(emaAlpha(10, 0)).toBe(1);
  });

  it("increases with larger dt relative to tau", () => {
    const slow = emaAlpha(10, 1000);
    const fast = emaAlpha(200, 1000);
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeLessThan(1);
  });
});

describe("magnitude", () => {
  it("computes Euclidean norm", () => {
    expect(magnitude(3, 4, 0)).toBe(5);
    expect(magnitude(0, 0, 9.81)).toBeCloseTo(9.81);
  });
});

describe("meanStd", () => {
  it("respects minStd floor", () => {
    const { std } = meanStd([1, 1, 1], 0.5);
    expect(std).toBe(0.5);
  });

  it("computes mean and spread", () => {
    const { mean, std } = meanStd([0, 2], 0.01);
    expect(mean).toBe(1);
    expect(std).toBe(1);
  });
});

describe("createStepDetector pure behaviour", () => {
  it("ignores out-of-order and duplicate timestamps", () => {
    const d = createStepDetector({ warmupPeaks: 2, startupIgnoreMs: 0 });
    d.push({ x: 0, y: 0, z: 10, t: 100 });
    d.push({ x: 0, y: 0, z: 12, t: 90 }); // out of order
    d.push({ x: 0, y: 0, z: 12, t: 100 }); // duplicate
    expect(d.state.sampleCount).toBe(1);
  });

  it("discards startup window samples for counting", () => {
    const d = createStepDetector({ startupIgnoreMs: 500, warmupPeaks: 2 });
    // sharp fake peaks inside startup
    for (let t = 0; t < 400; t += 20) {
      const z = t % 40 === 0 ? 14 : 9.8;
      d.push({ x: 0, y: 0, z, t });
    }
    expect(d.state.totalSteps).toBe(0);
  });

  it("enforces refractory between accepted peaks", () => {
    const d = createStepDetector({
      startupIgnoreMs: 0,
      warmupPeaks: 2,
      refractoryMs: 300,
      kStd: 0.5,
      minStd: 0.01,
      highPassTauMs: 200,
      lowPassTauMs: 20,
      windowMs: 1000,
    });
    // Build a simple oscillating signal after gravity settles
    let steps = 0;
    for (let i = 0; i < 200; i++) {
      const t = i * 20;
      const z = 9.81 + 3 * Math.max(0, Math.sin((2 * Math.PI * i) / 8));
      steps += d.push({ x: 0, y: 0, z, t });
    }
    // Even with aggressive peaks, cadence/refractory should keep rate sane
    const elapsed = 199 * 20;
    const maxPossible = Math.floor(elapsed / 250) + 5;
    expect(steps).toBeLessThan(maxPossible);
  });

  it("breaks cadence on long gaps and requires re-confirmation", () => {
    const d = createStepDetector({
      ...DEFAULT_DETECTOR_CONFIG,
      startupIgnoreMs: 100,
      warmupPeaks: 4,
      cadenceBreakMs: 1500,
    });
    const cadence = 500;
    let t = 0;
    const pulse = (amp: number) => {
      for (let i = 0; i < 10; i++) {
        const z = 9.81 + amp * Math.max(0, Math.sin((Math.PI * i) / 5));
        d.push({ x: 0, y: 0, z, t });
        t += 20;
      }
      // quiet between peaks
      for (let i = 0; i < Math.floor((cadence - 200) / 20); i++) {
        d.push({ x: 0, y: 0, z: 9.81, t });
        t += 20;
      }
    };

    for (let n = 0; n < 6; n++) pulse(3);
    const beforeGap = d.state.totalSteps;
      // long gap without samples (simulates background pause)
      t += 2500;
      d.push({ x: 0, y: 0, z: 9.81, t });
      t += 20;
      expect(d.state.cadenceConfirmed).toBe(false);
    // need warm-up again — first few after gap should not instantly dump many steps
    const mid = d.state.totalSteps;
    for (let n = 0; n < 2; n++) pulse(3);
    expect(d.state.totalSteps - mid).toBeLessThanOrEqual(2);
    void beforeGap;
  });

  it("reset clears totals", () => {
    const d = createStepDetector();
    d.push({ x: 0, y: 0, z: 10, t: 0 });
    d.reset();
    expect(d.state.sampleCount).toBe(0);
    expect(d.state.totalSteps).toBe(0);
    expect(d.state.startedAt).toBeNull();
  });
});
