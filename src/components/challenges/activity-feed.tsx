"use client";

import { Activity } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTimeAgo } from "@/utils/date";
import type { ChallengeActivityEvent } from "@/types/database";

interface ChallengeActivityFeedProps {
  events: ChallengeActivityEvent[];
}

function describeEvent(event: ChallengeActivityEvent): string {
  const actor = event.actor_name ?? "Someone";
  const target = event.target_name ?? "someone";

  switch (event.event_type) {
    case "join":
      return `${actor} joined the challenge`;
    case "goal_hit":
      return `${actor} hit the daily goal`;
    case "cheer":
      return `${actor} cheered ${target} ${event.emoji ?? ""}`.trim();
    default:
      return `${actor} did something`;
  }
}

export function ChallengeActivityFeed({ events }: ChallengeActivityFeedProps) {
  if (!events.length) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Joins, goal hits, and cheers will show up here."
        className="border-0 bg-transparent shadow-none py-8"
      />
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={`${event.event_type}-${event.created_at}-${event.actor_user_id}-${event.target_user_id ?? ""}`} className="flex items-start gap-3">
          <Avatar
            name={event.actor_name ?? "?"}
            src={event.actor_avatar}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug">{describeEvent(event)}</p>
            <p className="text-muted text-xs">{formatTimeAgo(event.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
