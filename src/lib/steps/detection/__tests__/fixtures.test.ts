import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createStepDetector } from "../detector";
import type { MotionTrace } from "../synthesize";

const FIXTURE_DIR = join(__dirname, "../__fixtures__");

function loadFixtures(): MotionTrace[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(FIXTURE_DIR, f), "utf8")) as MotionTrace);
}

function runTrace(trace: MotionTrace): number {
  const detector = createStepDetector();
  let steps = 0;
  for (const sample of trace.samples) {
    steps += detector.push(sample);
  }
  return steps;
}

describe("step detector vs committed fixtures", () => {
  const fixtures = loadFixtures();

  it("loads the expected fixture set", () => {
    const names = fixtures.map((f) => f.name).sort();
    expect(names).toEqual(
      [
        "brisk-walking",
        "climbing-stairs",
        "hand-walking",
        "pocket-walking",
        "scrolling-hand",
        "sitting-still",
        "steady-walking",
        "vehicle",
      ].sort()
    );
  });

  for (const trace of fixtures) {
    it(`${trace.name}: ${trace.label}`, () => {
      const detected = runTrace(trace);
      const trueSteps = trace.trueSteps ?? 0;

      if (trace.expectNearZero) {
        const errNote = `near-zero fixture — detected ${detected} (true ${trueSteps})`;
        console.log(`[fixture] ${trace.name}: ${errNote}`);
        expect(detected, errNote).toBeLessThanOrEqual(2);
        return;
      }

      const absErr = Math.abs(detected - trueSteps);
      const errPct = trueSteps > 0 ? (absErr / trueSteps) * 100 : detected > 0 ? 100 : 0;
      const tolPct = (trace.tolerancePct ?? 0.2) * 100;
      console.log(
        `[fixture] ${trace.name}: detected=${detected} true=${trueSteps} error=${errPct.toFixed(1)}% (tol ±${tolPct.toFixed(0)}%)`
      );

      expect(
        errPct,
        `${trace.name} error ${errPct.toFixed(1)}% exceeds ±${tolPct}% (detected ${detected}, true ${trueSteps})`
      ).toBeLessThanOrEqual(tolPct);
    });
  }
});
