import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getChallengeByToken, joinChallenge } from "@/lib/challenges/service";

function makeSupabase(handlers: {
  rpc?: ReturnType<typeof vi.fn>;
  from?: ReturnType<typeof vi.fn>;
}) {
  return {
    rpc: handlers.rpc ?? vi.fn(),
    from: handlers.from ?? vi.fn(),
  } as unknown as SupabaseClient;
}

describe("getChallengeByToken", () => {
  it("calls get_challenge_by_invite_token RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: "c1", name: "Walk", member_count: 3 }],
      error: null,
    });
    const supabase = makeSupabase({ rpc });

    const result = await getChallengeByToken(supabase, "token-abc");

    expect(rpc).toHaveBeenCalledWith("get_challenge_by_invite_token", { p_token: "token-abc" });
    expect(result.name).toBe("Walk");
    expect(result.member_count).toBe(3);
  });

  it("throws when RPC returns no row", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const supabase = makeSupabase({ rpc });
    await expect(getChallengeByToken(supabase, "bad")).rejects.toThrow("Challenge not found");
  });
});

describe("joinChallenge", () => {
  it("uses direct upsert when user is challenge creator", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "challenges") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { created_by: "user-1" } }),
            }),
          }),
        };
      }
      if (table === "challenge_members") {
        return { upsert };
      }
      if (table === "chat_rooms") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "room-1" } }),
            }),
          }),
        };
      }
      if (table === "chat_members") {
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const supabase = makeSupabase({ from, rpc });

    await joinChallenge(supabase, "user-1", "c1");

    expect(upsert).toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("backfill_challenge_steps", { p_challenge_id: "c1" });
  });

  it("uses join_challenge_with_invite RPC for non-creators", async () => {
    const joinRpc = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "challenges") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { created_by: "other-user" } }),
            }),
          }),
        };
      }
      if (table === "chat_rooms") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "room-2" } }),
            }),
          }),
        };
      }
      if (table === "chat_members") {
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
    const rpc = vi.fn((name: string) => {
      if (name === "join_challenge_with_invite") return joinRpc();
      return Promise.resolve({ error: null });
    });
    const supabase = makeSupabase({ from, rpc });

    await joinChallenge(supabase, "user-1", "c1", "invite-token");

    expect(joinRpc).toHaveBeenCalled();
  });
});
