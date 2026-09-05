import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { flushPendingNotificationReads } from "@/lib/notifications/offline-sync";

const pendingStore: Array<{
  id?: number;
  userId: string;
  notificationId: string | null;
  markAll: boolean;
  createdAt: string;
}> = [];

let nextId = 1;

vi.mock("@/lib/offline/notification-queue", () => ({
  getPendingReads: vi.fn(async () =>
    pendingStore.map((item) => ({
      id: item.id,
      userId: item.userId,
      notificationId: item.notificationId,
      markAll: item.markAll,
      createdAt: item.createdAt,
    }))
  ),
  clearPendingRead: vi.fn(async (id: number) => {
    const idx = pendingStore.findIndex((p) => p.id === id);
    if (idx >= 0) pendingStore.splice(idx, 1);
  }),
}));

const markReadMock = vi.fn();
const markAllReadMock = vi.fn();

vi.mock("@/lib/notifications/service", () => ({
  markRead: (...args: unknown[]) => markReadMock(...args),
  markAllRead: (...args: unknown[]) => markAllReadMock(...args),
}));

const supabase = {} as SupabaseClient;

beforeEach(() => {
  pendingStore.length = 0;
  nextId = 1;
  markReadMock.mockReset();
  markAllReadMock.mockReset();
});

describe("flushPendingNotificationReads", () => {
  it("flushes queued single reads on reconnect", async () => {
    pendingStore.push({
      id: nextId++,
      userId: "user-1",
      notificationId: "n-1",
      markAll: false,
      createdAt: new Date().toISOString(),
    });
    pendingStore.push({
      id: nextId++,
      userId: "user-1",
      notificationId: "n-2",
      markAll: false,
      createdAt: new Date().toISOString(),
    });

    const result = await flushPendingNotificationReads(supabase, "user-1");

    expect(result.error).toBeNull();
    expect(result.flushed).toBe(2);
    expect(markReadMock).toHaveBeenCalledTimes(2);
    expect(pendingStore).toHaveLength(0);
  });

  it("surfaces an error instead of silently reverting when sync fails", async () => {
    pendingStore.push({
      id: nextId++,
      userId: "user-1",
      notificationId: "n-fail",
      markAll: false,
      createdAt: new Date().toISOString(),
    });
    markReadMock.mockRejectedValueOnce(new Error("network"));

    const result = await flushPendingNotificationReads(supabase, "user-1");

    expect(result.flushed).toBe(0);
    expect(result.error).toMatch(/sync read status/i);
    expect(pendingStore).toHaveLength(1);
  });

  it("enqueues mark-all reads and flushes them", async () => {
    pendingStore.push({
      id: nextId++,
      userId: "user-1",
      notificationId: null,
      markAll: true,
      createdAt: new Date().toISOString(),
    });

    const result = await flushPendingNotificationReads(supabase, "user-1");

    expect(result.error).toBeNull();
    expect(markAllReadMock).toHaveBeenCalledOnce();
    expect(pendingStore).toHaveLength(0);
  });
});
