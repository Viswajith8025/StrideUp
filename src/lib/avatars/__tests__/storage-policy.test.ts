import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { avatarObjectPath, avatarPathFromPublicUrl } from "@/lib/avatars/storage";

const setupSql = readFileSync(join(__dirname, "../../../../supabase/setup.sql"), "utf-8");

describe("avatar storage policies", () => {
  it("restricts writes to the authenticated user's path prefix", () => {
    expect(setupSql).toMatch(
      /CREATE POLICY avatars_insert_own[\s\S]*\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/
    );
    expect(setupSql).toMatch(
      /CREATE POLICY avatars_update_own[\s\S]*\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/
    );
    expect(setupSql).toMatch(
      /CREATE POLICY avatars_delete_own[\s\S]*\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/
    );
  });

  it("uses user_id/filename path layout for uploads", async () => {
    const hash = "abc123def4567890";
    expect(avatarObjectPath("abc-123", hash)).toBe("abc-123/abc123def4567890.webp");
    expect(
      avatarPathFromPublicUrl(
        "https://example.supabase.co/storage/v1/object/public/avatars/abc-123/abc123def4567890.webp"
      )
    ).toBe("abc-123/abc123def4567890.webp");
  });
});
