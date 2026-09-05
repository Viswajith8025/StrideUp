import type { SupabaseClient } from "@supabase/supabase-js";
import { AVATAR_BUCKET } from "./constants";

/** SHA-256 hex digest (first 16 chars) used as the WebP filename. */
export async function hashAvatarBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(buffer));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export function avatarObjectPath(userId: string, contentHash: string): string {
  return `${userId}/${contentHash}.webp`;
}

/** Extract the storage object path from a public avatar URL. */
export function avatarPathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${AVATAR_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
}

export async function deleteStoredAvatar(
  supabase: SupabaseClient,
  path: string | null
): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw error;
}

export async function uploadAvatarBlob(
  supabase: SupabaseClient,
  userId: string,
  blob: Blob,
  previousUrl?: string | null
): Promise<string> {
  const contentHash = await hashAvatarBlob(blob);
  const path = avatarObjectPath(userId, contentHash);
  const previousPath = avatarPathFromPublicUrl(previousUrl);

  if (previousPath && previousPath !== path) {
    await deleteStoredAvatar(supabase, previousPath);
  }

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("user_id", userId);
  if (profileError) throw profileError;

  return publicUrl;
}
