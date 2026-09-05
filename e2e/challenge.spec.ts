import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { user2AuthFile } from "../playwright.config";

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("create challenge -> invite -> second user joins -> leaderboard ordering", async ({ browser, page }) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Service role required");

  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const challengeName = `E2E Challenge ${Date.now()}`;

  await page.goto("/challenges");
  await page.getByRole("button", { name: "Create challenge" }).click();
  await page.getByPlaceholder("Name").fill(challengeName);
  await page.locator('input[type="date"]').nth(0).fill(today);
  await page.locator('input[type="date"]').nth(1).fill(end);
  await page.getByPlaceholder("Step goal").fill("5000");
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("link", { name: challengeName }).click();

  const admin = serviceClient();
  const { data: challenge } = await admin
    .from("challenges")
    .select("id, invite_token")
    .eq("name", challengeName)
    .single();
  expect(challenge?.invite_token).toBeTruthy();

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user1 = users.users.find((u) => u.email === (process.env.E2E_USER1_EMAIL ?? "e2e-user1@strideup.test"));
  const user2 = users.users.find((u) => u.email === (process.env.E2E_USER2_EMAIL ?? "e2e-user2@strideup.test"));
  expect(user1 && user2).toBeTruthy();

  const user2Context = await browser.newContext({
    storageState: JSON.parse(readFileSync(user2AuthFile, "utf8")),
  });
  const user2Page = await user2Context.newPage();
  await user2Page.goto(`/invite/${challenge!.invite_token}`);
  await user2Page.getByRole("button", { name: /Join on/i }).click();
  await user2Page.waitForURL(`**/challenges/${challenge!.id}`);

  await admin.from("daily_activity").upsert(
    { user_id: user1!.id, date: today, steps: 9000, source: "manual" },
    { onConflict: "user_id,date" }
  );
  await admin.from("daily_activity").upsert(
    { user_id: user2!.id, date: today, steps: 3000, source: "manual" },
    { onConflict: "user_id,date" }
  );
  await admin.rpc("backfill_challenge_steps", { p_challenge_id: challenge!.id });

  await page.reload();
  const firstRank = page.locator('[data-testid="leaderboard-rank"]').first();
  await expect(firstRank).toHaveText("#1");
  await expect(page.getByText("9,000").first()).toBeVisible();
  await user2Context.close();
});
