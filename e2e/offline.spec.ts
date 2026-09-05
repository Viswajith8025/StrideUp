import { test, expect } from "@playwright/test";

test("offline step entry persists after reconnect", async ({ page, context }) => {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Supabase required");

  await page.goto("/home");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Add steps" }).click();
  const steps = String(500 + Math.floor(Math.random() * 500));
  await page.getByPlaceholder("Number of steps").fill(steps);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText(steps.replace(/\B(?=(\d{3})+(?!\d))/g, ","))).toBeVisible({ timeout: 20_000 });
});
