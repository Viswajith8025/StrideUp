import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeImport } from "@/lib/import-export";
import type { Profile } from "@/types/database";

const profile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  display_name: "Test User",
  avatar_url: null,
  weight_kg: 70,
  height_cm: 170,
  stride_length_cm: null,
  daily_step_goal: 6000,
  role: "user",
  timezone: "UTC",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function createMockSupabase() {
  const dailyActivityUpserts: Record<string, unknown>[] = [];

  const supabase = {
    from(table: string) {
      return {
        select() {
          return {
            eq(_col: string, _val: string) {
              return {
                eq() {
                  return {
                    async maybeSingle() {
                      return { data: null, error: null };
                    },
                  };
                },
              };
            },
          };
        },
        upsert(payload: Record<string, unknown>) {
          if (table === "daily_activity") {
            dailyActivityUpserts.push(payload);
          }
          return {
            select() {
              return {
                async single() {
                  return { data: payload, error: null };
                },
              };
            },
          };
        },
      };
    },
    getUpserts() {
      return dailyActivityUpserts;
    },
  };

  return supabase;
}

describe("steps service", () => {
  it("does not reference challenge tables", () => {
    const source = readFileSync(join(__dirname, "../service.ts"), "utf-8");
    expect(source).not.toMatch(/challenge/i);
  });
});

describe("executeImport past dates", () => {
  it("writes daily_activity rows for each imported historical date", async () => {
    const mock = createMockSupabase();

    const imported = await executeImport(
      mock as unknown as SupabaseClient,
      profile.user_id,
      profile,
      [
        { date: "2026-01-01", steps: 5000 },
        { date: "2026-01-15", steps: 8200 },
      ]
    );

    expect(imported).toBe(2);
    const upserts = mock.getUpserts();
    expect(upserts).toHaveLength(2);
    expect(upserts[0]).toMatchObject({
      user_id: profile.user_id,
      date: "2026-01-01",
      steps: 5000,
      source: "import",
    });
    expect(upserts[1]).toMatchObject({
      user_id: profile.user_id,
      date: "2026-01-15",
      steps: 8200,
      source: "import",
    });
  });
});
