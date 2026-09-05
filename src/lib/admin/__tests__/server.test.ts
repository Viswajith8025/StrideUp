import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAdminUsers, loadAdminMetrics } from "@/lib/admin/server";
import { ADMIN_PAGE_SIZE } from "@/lib/admin/types";

function createAdminMock() {
  const supabase = {
    from(table: string) {
      if (table === "admin_metrics") {
        return {
          select: () => ({
            single: async () => ({
              data: {
                dau_30d: 10,
                total_steps_this_week: 50000,
                active_challenges: 2,
                new_signups_this_week: 3,
                push_subscription_count: 4,
              },
              error: null,
            }),
          }),
        };
      }
      if (table === "admin_user_list") {
        return {
          select: () => {
            const builder = {
              ilike: () => builder,
              order: () => builder,
              range: async () => ({
                data: [{ user_id: "u1", display_name: "Alice", avatar_url: null, role: "user", is_active: true, total_steps: 1000, created_at: "2026-01-01" }],
                error: null,
                count: 1,
              }),
            };
            return builder;
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return supabase as unknown as SupabaseClient;
}

describe("loadAdminMetrics", () => {
  it("queries admin_metrics once", async () => {
    const metrics = await loadAdminMetrics(createAdminMock());
    expect(metrics.dau_30d).toBe(10);
    expect(metrics.push_subscription_count).toBe(4);
  });
});

describe("loadAdminUsers", () => {
  it("paginates with range() using page size 25", async () => {
    const result = await loadAdminUsers(createAdminMock(), {
      page: 1,
      sort: "created_at",
      sortDir: "desc",
    });
    expect(result.pageSize).toBe(ADMIN_PAGE_SIZE);
    expect(result.users).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
