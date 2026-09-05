import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/types/database";
import { listNotifications } from "@/lib/notifications/service";

function makeNotification(id: string, created_at: string): Notification {
  return {
    id,
    user_id: "user-1",
    title: "Test",
    body: "Body",
    type: "test",
    read: false,
    category: null,
    local_date: null,
    url: null,
    created_at,
  };
}

function paginate(rows: Notification[], limit: number, cursor?: { created_at: string; id: string }) {
  const sorted = [...rows].sort((a, b) => {
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

  let filtered = sorted;
  if (cursor) {
    filtered = sorted.filter((row) => {
      if (row.created_at < cursor.created_at) return true;
      if (row.created_at === cursor.created_at && row.id < cursor.id) return true;
      return false;
    });
  }

  const slice = filtered.slice(0, limit);
  return { data: slice, error: null };
}

function createNotificationMock(rows: Notification[]) {
  let cursor: { created_at: string; id: string } | undefined;
  let fetchLimit = 21;

  const execute = () => paginate(rows, fetchLimit, cursor);

  const terminal = {
    or(filter: string) {
      const eqMatch = filter.match(/created_at\.eq\.([^,]+),id\.lt\.([^)]+)/);
      if (eqMatch) {
        cursor = { created_at: eqMatch[1], id: eqMatch[2] };
      }
      return terminal;
    },
    then(resolve: (value: { data: Notification[]; error: null }) => void) {
      resolve(execute());
    },
  };

  const builder = {
    eq() {
      return builder;
    },
    order() {
      return builder;
    },
    limit(n: number) {
      fetchLimit = n;
      return terminal;
    },
  };

  const supabase = {
    from(table: string) {
      if (table !== "notifications") throw new Error(`unexpected table ${table}`);
      cursor = undefined;
      fetchLimit = 21;
      return {
        select() {
          return builder;
        },
      };
    },
  };

  return supabase as unknown as SupabaseClient;
}

describe("listNotifications keyset pagination", () => {
  const rows = [
    makeNotification("id-2", "2026-09-05T12:00:00.000Z"),
    makeNotification("id-1", "2026-09-05T12:00:00.000Z"),
    makeNotification("id-3", "2026-09-04T10:00:00.000Z"),
    makeNotification("id-4", "2026-09-03T10:00:00.000Z"),
    makeNotification("id-5", "2026-09-02T10:00:00.000Z"),
  ];

  it("returns the first page", async () => {
    const supabase = createNotificationMock(rows);
    const result = await listNotifications(supabase, "user-1", { limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe("id-2");
    expect(result.items[1].id).toBe("id-1");
    expect(result.nextCursor).toEqual({
      created_at: "2026-09-05T12:00:00.000Z",
      id: "id-1",
    });
  });

  it("returns a cursor page", async () => {
    const supabase = createNotificationMock(rows);
    const first = await listNotifications(supabase, "user-1", { limit: 2 });
    const second = await listNotifications(supabase, "user-1", {
      limit: 2,
      cursor: first.nextCursor,
    });

    expect(second.items).toHaveLength(2);
    expect(second.items[0].id).toBe("id-3");
    expect(second.items[1].id).toBe("id-4");
  });

  it("returns null cursor at end of list", async () => {
    const supabase = createNotificationMock(rows);
    let cursor = (await listNotifications(supabase, "user-1", { limit: 2 })).nextCursor;
    cursor = (await listNotifications(supabase, "user-1", { limit: 2, cursor })).nextCursor;
    const last = await listNotifications(supabase, "user-1", { limit: 2, cursor });

    expect(last.items).toHaveLength(1);
    expect(last.items[0].id).toBe("id-5");
    expect(last.nextCursor).toBeNull();
  });

  it("handles a page boundary where two rows share created_at", async () => {
    const supabase = createNotificationMock(rows);
    const page = await listNotifications(supabase, "user-1", {
      limit: 1,
      cursor: { created_at: "2026-09-05T12:00:00.000Z", id: "id-2" },
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].id).toBe("id-1");
    expect(page.nextCursor).toEqual({
      created_at: "2026-09-05T12:00:00.000Z",
      id: "id-1",
    });
  });
});
