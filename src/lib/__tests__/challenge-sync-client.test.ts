import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_ROOT = join(__dirname, "../../..");
const SRC_DIR = join(SRC_ROOT, "src");

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("challenge_daily_steps client write path", () => {
  const forbiddenPatterns = [
    /\.from\(\s*["']challenge_daily_steps["']\s*\)/,
    /syncChallengeSteps/,
    /challenge_daily_steps.*\.upsert/,
    /challenge_daily_steps.*\.insert/,
    /challenge_daily_steps.*\.update/,
    /challenge_daily_steps.*\.delete/,
  ];

  it("has no client write path to challenge_daily_steps anywhere under src/", () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_DIR)) {
      const source = readFileSync(file, "utf-8");
      if (!source.includes("challenge_daily_steps") && !source.includes("syncChallengeSteps")) {
        continue;
      }
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(source)) {
          offenders.push(`${relative(SRC_ROOT, file)}: matched ${pattern}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("steps service does not reference challenge tables", () => {
    const source = readFileSync(join(__dirname, "../steps/service.ts"), "utf-8");
    expect(source).not.toMatch(/challenge/i);
  });

  it("offline sync only flushes daily_activity via addSteps", () => {
    const source = readFileSync(join(__dirname, "../offline/sync.ts"), "utf-8");
    expect(source).not.toMatch(/challenge/i);
    expect(source).toContain("addSteps");
  });

  it("challenges service does not write challenge_daily_steps", () => {
    const source = readFileSync(join(__dirname, "../challenges/service.ts"), "utf-8");
    expect(source).not.toMatch(/challenge_daily_steps/);
    expect(source).not.toMatch(/syncChallengeSteps/);
    expect(source).toContain("backfill_challenge_steps");
  });

  it("useSteps does not sync challenge steps client-side", () => {
    const source = readFileSync(join(SRC_DIR, "hooks/useSteps.ts"), "utf-8");
    expect(source).not.toMatch(/challenge/i);
  });
});
