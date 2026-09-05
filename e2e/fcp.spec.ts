import { test, expect } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";

test("authenticated /home FCP on production build", async ({ page }) => {
  test.skip(!process.env.CI && !process.env.MEASURE_FCP, "Run with MEASURE_FCP=1 or in CI");

  await page.goto("/home", { waitUntil: "networkidle" });
  const fcp = await page.evaluate(() => {
    const entry = performance.getEntriesByName("first-contentful-paint")[0] as PerformanceEntry | undefined;
    return entry?.startTime ?? null;
  });

  expect(fcp).not.toBeNull();
  mkdirSync("e2e/reports", { recursive: true });
  writeFileSync("e2e/reports/fcp.json", JSON.stringify({ fcp_ms: fcp, route: "/home", preset: "mobile" }, null, 2));
  console.log(`FCP (authenticated /home): ${fcp}ms`);
  expect(fcp!).toBeLessThan(10_000);
});
