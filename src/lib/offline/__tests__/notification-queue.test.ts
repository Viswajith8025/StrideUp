import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<number, Record<string, unknown>>();
let autoId = 1;

vi.mock("idb", () => ({
  openDB: vi.fn(async () => ({
    add: vi.fn(async (_store: string, value: Record<string, unknown>) => {
      const id = autoId++;
      store.set(id, { ...value, id });
      return id;
    }),
    getAll: vi.fn(async () => Array.from(store.values())),
    delete: vi.fn(async (_store: string, id: number) => {
      store.delete(id);
    }),
  })),
}));

import { queueMarkRead, getPendingReads, clearPendingRead } from "@/lib/offline/notification-queue";

beforeEach(() => {
  store.clear();
  autoId = 1;
});

describe("notification-queue", () => {
  it("enqueues markRead operations for offline flush", async () => {
    await queueMarkRead("user-1", "notification-1");
    const pending = await getPendingReads();

    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      userId: "user-1",
      notificationId: "notification-1",
      markAll: false,
    });
  });

  it("clears items after a successful flush", async () => {
    await queueMarkRead("user-1", "notification-1");
    const pending = await getPendingReads();
    await clearPendingRead(pending[0].id!);

    expect(await getPendingReads()).toHaveLength(0);
  });
});
