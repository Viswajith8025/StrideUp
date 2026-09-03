"use client";

import { type ReactNode } from "react";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { useUnread } from "@/hooks/useUnread";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  const { unreadCount } = useUnread();

  return (
    <div className="min-h-screen bg-background text-foreground safe-top">
      <main className={showNav ? "pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]" : ""}>
        <div className="mx-auto max-w-lg px-4">{children}</div>
      </main>
      {showNav && <BottomNav unreadCount={unreadCount} />}
    </div>
  );
}
