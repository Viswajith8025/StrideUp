"use client";

import Link from "next/link";
import { type LucideIcon, Trophy, Footprints, MessageCircle, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface-raised flex flex-col items-center justify-center rounded-2xl px-6 py-10 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Icon size={28} strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-[16rem] leading-relaxed mb-5">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex h-9 items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground pressable"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button size="sm" onClick={onAction} className="pressable">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export const EmptyIcons = { Trophy, Footprints, MessageCircle, BarChart3, Sparkles };
