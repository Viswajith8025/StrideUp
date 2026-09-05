import { describe, it, expect } from "vitest";
import { avatarUploadFileSchema } from "@/lib/validation/schemas";
import { AVATAR_MAX_BYTES } from "@/lib/avatars/constants";

function makeFile(size: number, type: string): File {
  return new File([new Uint8Array(size)], "avatar.jpg", { type });
}

describe("avatarUploadFileSchema", () => {
  it("accepts a valid image under 2MB", () => {
    const file = makeFile(1024, "image/jpeg");
    expect(avatarUploadFileSchema.safeParse(file).success).toBe(true);
  });

  it("rejects oversized files", () => {
    const file = makeFile(AVATAR_MAX_BYTES + 1, "image/jpeg");
    const result = avatarUploadFileSchema.safeParse(file);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/2MB/i);
    }
  });

  it("rejects unsupported mime types", () => {
    const file = makeFile(1024, "application/pdf");
    const result = avatarUploadFileSchema.safeParse(file);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/unsupported/i);
    }
  });
});
