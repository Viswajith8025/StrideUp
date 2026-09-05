import { describe, it, expect } from "vitest";
import {
  avatarObjectPath,
  hashAvatarBlob,
} from "@/lib/avatars/storage";

describe("avatar storage paths", () => {
  it("uses a content-hashed filename under the user folder", async () => {
    const blobA = new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" });
    const hashA = await hashAvatarBlob(blobA);
    expect(avatarObjectPath("user-1", hashA)).toBe(`user-1/${hashA}.webp`);
  });

  it("produces different paths for two different uploads", async () => {
    const blobA = new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" });
    const blobB = new Blob([new Uint8Array([4, 5, 6])], { type: "image/webp" });
    const pathA = avatarObjectPath("user-1", await hashAvatarBlob(blobA));
    const pathB = avatarObjectPath("user-1", await hashAvatarBlob(blobB));
    expect(pathA).not.toBe(pathB);
  });
});
