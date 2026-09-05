import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { authFile, inactiveAuthFile, user2AuthFile } from "../playwright.config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const users = {
  user1: {
    email: process.env.E2E_USER1_EMAIL ?? "e2e-user1@strideup.test",
    password: process.env.E2E_USER1_PASSWORD ?? "StrideUpE2E!1",
    file: authFile,
  },
  user2: {
    email: process.env.E2E_USER2_EMAIL ?? "e2e-user2@strideup.test",
    password: process.env.E2E_USER2_PASSWORD ?? "StrideUpE2E!2",
    file: user2AuthFile,
  },
  inactive: {
    email: process.env.E2E_INACTIVE_EMAIL ?? "e2e-inactive@strideup.test",
    password: process.env.E2E_INACTIVE_PASSWORD ?? "StrideUpE2E!3",
    file: inactiveAuthFile,
  },
};

async function ensureUser(email: string, password: string, meta?: Record<string, string>) {
  if (!url || !serviceKey) return;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = list.users.find((u) => u.email === email);
  if (!existing) {
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    });
  }
}

async function loginAndSave(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  file: string,
  expectedPath: string = "**/home"
) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(expectedPath, { timeout: 30_000 });
  mkdirSync("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: file });
}

setup("seed and authenticate e2e users", async ({ page }) => {
  setup.skip(!url || !anon, "Supabase env vars required for E2E");

  await ensureUser(users.user1.email, users.user1.password, { display_name: "E2E User One" });
  await ensureUser(users.user2.email, users.user2.password, { display_name: "E2E User Two" });
  await ensureUser(users.inactive.email, users.inactive.password, { display_name: "E2E Inactive" });

  if (serviceKey) {
    const admin = createClient(url!, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    const inactive = list.users.find((u) => u.email === users.inactive.email);
    if (inactive) {
      await admin.from("profiles").update({ is_active: false }).eq("user_id", inactive.id);
    }
    for (const u of [users.user1, users.user2]) {
      const found = list.users.find((x) => x.email === u.email);
      if (found) {
        await admin.from("app_settings").update({ step_counter_setup_complete: true }).eq("user_id", found.id);
      }
    }
  }

  await loginAndSave(page, users.user1.email, users.user1.password, users.user1.file);

  const page2 = await page.context().browser()!.newPage();
  await loginAndSave(page2, users.user2.email, users.user2.password, users.user2.file);
  await page2.close();

  const inactivePage = await page.context().browser()!.newPage();
  await loginAndSave(inactivePage, users.inactive.email, users.inactive.password, users.inactive.file, "**/blocked");
  await inactivePage.close();
});
