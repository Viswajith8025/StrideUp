"use client";

import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatSteps } from "@/utils/formatting";
import { formatTimeAgo } from "@/utils/date";
import type { LeaderboardEntry } from "@/types/database";
import { Plus, UserPlus } from "lucide-react";
import Link from "next/link";

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  challengeId?: string;
}

export function LeaderboardPreview({ entries, currentUserId, challengeId }: LeaderboardPreviewProps) {
  const slots = [0, 1, 2];

  return (
    <Card>
      <div className="space-y-3">
        {slots.map((idx) => {
          const entry = entries[idx];
          if (entry) {
            const isMe = entry.user_id === currentUserId;
            return (
              <div key={entry.user_id} className="flex items-center gap-3">
                <span className="text-muted w-4 text-sm font-medium">{entry.rank}</span>
                <Avatar name={entry.display_name} src={entry.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{entry.display_name}</span>
                    {isMe && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        Me
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">{formatSteps(entry.total_steps)}</div>
                  <div className="text-muted text-xs">Now</div>
                </div>
              </div>
            );
          }
          return (
            <div key={`empty-${idx}`} className="flex items-center gap-3 opacity-60">
              <span className="text-muted w-4 text-sm">{idx + 1}</span>
              <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted flex items-center justify-center">
                <Plus size={14} className="text-muted" />
              </div>
              <span className="text-muted text-sm flex items-center gap-1">
                <UserPlus size={14} /> Invite someone
              </span>
            </div>
          );
        })}
      </div>
      {challengeId && (
        <Link
          href={`/challenges/${challengeId}`}
          className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground ml-auto"
          aria-label="View challenge"
        >
          <Plus size={24} />
        </Link>
      )}
    </Card>
  );
}
