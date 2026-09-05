import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { user2AuthFile } from "../playwright.config";

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("chat message appears in second browser via Realtime", async ({ browser, page }) => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, "Service role required");

  const admin = serviceClient();
  const email1 = process.env.E2E_USER1_EMAIL ?? "e2e-user1@strideup.test";
  const email2 = process.env.E2E_USER2_EMAIL ?? "e2e-user2@strideup.test";
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user1 = users.users.find((u) => u.email === email1);
  const user2 = users.users.find((u) => u.email === email2);
  expect(user1 && user2).toBeTruthy();

  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const name = `E2E Chat ${Date.now()}`;
  const { data: challenge } = await admin
    .from("challenges")
    .insert({
      name,
      start_date: today,
      end_date: end,
      step_goal: 1000,
      created_by: user1!.id,
      status: "active",
    })
    .select("id")
    .single();

  await admin.from("challenge_members").upsert([
    { challenge_id: challenge!.id, user_id: user1!.id },
    { challenge_id: challenge!.id, user_id: user2!.id },
  ]);

  const { data: room } = await admin
    .from("chat_rooms")
    .upsert({ challenge_id: challenge!.id, name: "E2E Chat" }, { onConflict: "challenge_id" })
    .select("id")
    .single();

  await admin.from("chat_members").upsert([
    { room_id: room!.id, user_id: user1!.id },
    { room_id: room!.id, user_id: user2!.id },
  ]);

  const user2Context = await browser.newContext({
    storageState: JSON.parse(readFileSync(user2AuthFile, "utf8")),
  });
  const user2Page = await user2Context.newPage();
  const roomUrl = `/chats/${room!.id}`;
  await user2Page.goto(roomUrl);

  const message = `hello-${Date.now()}`;
  await page.goto(roomUrl);
  await page.getByPlaceholder("Type a message…").fill(message);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(user2Page.getByText(message)).toBeVisible({ timeout: 20_000 });
  await user2Context.close();
});
