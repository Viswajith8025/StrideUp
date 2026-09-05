import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCheer } from "@/lib/cheers/service";

describe("sendCheer", () => {
  it("returns duplicate when unique constraint is violated", async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        maybeSingle: async () => ({ data: null, error: { code: "23505" } }),
      }),
    });
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as unknown as SupabaseClient;

    const result = await sendCheer(supabase, {
      challengeId: "c1",
      fromUserId: "u1",
      toUserId: "u2",
      emoji: "🔥",
      date: "2026-01-01",
    });

    expect(result).toEqual({ ok: true, duplicate: true });
  });

  it("returns ok when cheer is inserted", async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        maybeSingle: async () => ({ data: { id: "cheer-1" }, error: null }),
      }),
    });
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as unknown as SupabaseClient;

    const result = await sendCheer(supabase, {
      challengeId: "c1",
      fromUserId: "u1",
      toUserId: "u2",
      emoji: "👏",
      date: "2026-01-01",
    });

    expect(result).toEqual({ ok: true, duplicate: false });
  });
});
