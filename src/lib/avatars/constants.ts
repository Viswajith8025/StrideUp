export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_WEBP_QUALITY = 0.85;
export const AVATAR_BUCKET = "avatars";
export const AVATAR_FILE_NAME = "avatar.webp";

export const AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
