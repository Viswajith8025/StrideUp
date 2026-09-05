import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { inactiveAuthFile } from "../playwright.config";

test.describe("deactivated user", () => {
  test.use({
    storageState: JSON.parse(readFileSync(inactiveAuthFile, "utf8")),
  });

  test("is redirected to /blocked and cannot reach /home", async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase required");

    await page.goto("/home");
    await page.waitForURL("**/blocked");
    await expect(page.getByRole("heading", { name: "Account deactivated" })).toBeVisible();
    await page.goto("/challenges");
    await page.waitForURL("**/blocked");
  });
});
