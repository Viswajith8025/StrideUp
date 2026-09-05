import type { LucideIcon } from "lucide-react";
import { Flame, Footprints, MessageCircle, Trophy, Bell } from "lucide-react";

export function CategoryIcon({
  category,
  className,
  size = 18,
}: {
  category: string | null;
  className?: string;
  size?: number;
}) {
  switch (category) {
    case "push_daily_goal":
      return <Footprints size={size} className={className} />;
    case "push_streak":
      return <Flame size={size} className={className} />;
    case "push_challenge":
      return <Trophy size={size} className={className} />;
    case "push_chat":
      return <MessageCircle size={size} className={className} />;
    default:
      return <Bell size={size} className={className} />;
  }
}

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
