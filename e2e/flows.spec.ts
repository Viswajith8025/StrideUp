import { test, expect } from "@playwright/test";

test.describe("signup and onboarding", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signup -> onboarding -> home", async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase required");

    const email = `e2e-signup-${Date.now()}@strideup.test`;
    await page.goto("/signup");
    await page.getByPlaceholder("Display name").fill("New Walker");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill("StrideUpE2E!signup1");
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.waitForURL("**/settings/step-counter");
    await page.getByRole("button", { name: "Complete Setup" }).click();
    await page.waitForURL("**/home");
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  });
});

test.describe("authenticated flows", () => {
  test("login -> manual step entry -> dashboard reflects total", async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase required");

    await page.goto("/home");
    await page.getByRole("button", { name: "Add steps" }).click();
    const steps = String(1000 + Math.floor(Math.random() * 9000));
    await page.getByPlaceholder("Number of steps").fill(steps);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(steps.replace(/\B(?=(\d{3})+(?!\d))/g, ","))).toBeVisible({ timeout: 15_000 });
  });
});
