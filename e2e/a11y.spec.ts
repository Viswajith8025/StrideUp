import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicRoutes = ["/login", "/signup", "/privacy", "/terms", "/support", "/blocked"];
const authedRoutes = ["/home", "/challenges", "/partner", "/results", "/notifications", "/settings", "/settings/profile"];

test.describe("accessibility", () => {
  for (const route of publicRoutes) {
    test(`axe: ${route}`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious).toEqual([]);
    });
  }

  for (const route of authedRoutes) {
    test(`axe (auth): ${route}`, async ({ page }) => {
      test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase required");
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious).toEqual([]);
    });
  }
});
