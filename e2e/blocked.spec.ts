import { test, expect } from "@playwright/test";
import { inactiveAuthFile } from "../playwright.config";

// Uses storageState path (not readFileSync) so missing auth files do not crash module load.
// The blocked project depends on auth.setup, which creates inactiveAuthFile before these tests run.
test.describe("deactivated user", () => {
  test.use({ storageState: inactiveAuthFile });

  test("is redirected to /blocked and cannot reach /home", async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase required");

    await page.goto("/home");
    await page.waitForURL("**/blocked");
    await expect(page.getByRole("heading", { name: "Account deactivated" })).toBeVisible();
    await page.goto("/challenges");
    await page.waitForURL("**/blocked");
  });
});
