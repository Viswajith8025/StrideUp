"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { useUnread } from "@/hooks/useUnread";
import { useNotifications } from "@/hooks/useNotifications";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
  showHeader?: boolean;
}

export function AppShell({ children, showNav = true, showHeader }: AppShellProps) {
  const { unreadCount: chatUnreadCount } = useUnread();
  const { headerBadgeCount } = useNotifications();
  const displayHeader = showHeader ?? showNav;

  return (
    <div className="min-h-screen bg-background text-foreground safe-top">
      {displayHeader && (
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-end px-4 py-3">
            <Link
              href="/notifications"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-card"
              aria-label={`Notifications${headerBadgeCount > 0 ? `, ${headerBadgeCount} unread` : ""}`}
            >
              <Bell size={22} />
              {headerBadgeCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {headerBadgeCount > 9 ? "9+" : headerBadgeCount}
                </span>
              )}
            </Link>
          </div>
        </header>
      )}
      <main className={showNav ? "pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]" : ""}>
        <div className="mx-auto max-w-lg px-4">{children}</div>
      </main>
      {showNav && <BottomNav unreadCount={chatUnreadCount} />}
    </div>
  );
}
