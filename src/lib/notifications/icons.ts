import type { LucideIcon } from "lucide-react";
import { Flame, Footprints, MessageCircle, Trophy, Bell } from "lucide-react";

export function getCategoryIcon(category: string | null): LucideIcon {
  switch (category) {
    case "push_daily_goal":
      return Footprints;
    case "push_streak":
      return Flame;
    case "push_challenge":
      return Trophy;
    case "push_chat":
      return MessageCircle;
    default:
      return Bell;
  }
}
