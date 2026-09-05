/**
 * Documentation tests: assert expected policy SQL is present in setup.sql.
 * These do NOT verify Postgres enforcement — hand-verify RLS from the browser console.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_PAGE_SIZE } from "@/lib/admin/types";

const setupSql = readFileSync(join(__dirname, "../../../../supabase/setup.sql"), "utf-8");

describe("admin RLS policies", () => {
  it("allows admins to update profiles via is_admin()", () => {
    expect(setupSql).toMatch(
      /CREATE POLICY profiles_update[\s\S]*user_id = auth\.uid\(\) OR public\.is_admin\(\)/
    );
  });

  it("allows admins to update challenges via is_admin()", () => {
    expect(setupSql).toMatch(
      /CREATE POLICY challenges_update[\s\S]*created_by = auth\.uid\(\) OR public\.is_admin\(\)/
    );
  });

  it("restricts reconcile_all_challenge_steps to admins", () => {
    expect(setupSql).toMatch(/reconcile_all_challenge_steps[\s\S]*public\.is_admin\(\)/);
  });
});

describe("admin pagination constants", () => {
  it("uses 25 rows per page", () => {
    expect(ADMIN_PAGE_SIZE).toBe(25);
  });
});

describe("non-admin profile mutation rejection", () => {
  it("documents that client-side admin gating is not sufficient", () => {
    const policies = setupSql.match(/CREATE POLICY profiles_update[\s\S]*?;/g) ?? [];
    const policy = policies[policies.length - 1] ?? "";
    expect(policy).toContain("is_admin()");
    expect(policy).toMatch(/user_id = auth\.uid\(\) OR public\.is_admin\(\)/);
  });
});
