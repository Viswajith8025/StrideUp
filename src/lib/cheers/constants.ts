export const CHEER_EMOJIS = ["👏", "🔥", "💪", "⭐", "🎉"] as const;

export type CheerEmoji = (typeof CHEER_EMOJIS)[number];

/** Display-only hint for UI copy. Rate limiting is enforced in notify-cheer edge function. */
export const MAX_CHEER_NOTIFICATIONS_PER_RECIPIENT_PER_DAY = 20;
