"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CHEER_EMOJIS, type CheerEmoji } from "@/lib/cheers/constants";

interface CheerControlProps {
  onCheer: (emoji: CheerEmoji) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function CheerControl({ onCheer, disabled, className }: CheerControlProps) {
  const [pending, setPending] = useState<CheerEmoji | null>(null);

  const handleCheer = async (emoji: CheerEmoji) => {
    if (disabled || pending) return;
    setPending(emoji);
    try {
      await onCheer(emoji);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)} role="group" aria-label="Send cheer">
      {CHEER_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={disabled || pending !== null}
          onClick={() => handleCheer(emoji)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-sm leading-none",
            "hover:bg-accent/10 active:scale-95 disabled:opacity-40",
            pending === emoji && "bg-accent/20"
          )}
          aria-label={`Cheer ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
