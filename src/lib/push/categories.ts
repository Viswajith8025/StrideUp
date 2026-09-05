export type PushCategory = "push_daily_goal" | "push_streak" | "push_challenge" | "push_chat";

export const PUSH_CATEGORY_LABELS: Record<PushCategory, string> = {
  push_daily_goal: "Daily goal reminder",
  push_streak: "Streak alerts",
  push_challenge: "Challenge updates",
  push_chat: "Chat messages",
};

export const PUSH_CATEGORY_DEFAULTS: Record<PushCategory, boolean> = {
  push_daily_goal: true,
  push_streak: true,
  push_challenge: true,
  push_chat: false,
};
