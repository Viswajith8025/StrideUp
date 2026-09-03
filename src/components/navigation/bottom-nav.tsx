"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, MessageCircle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/chats", label: "Chats", icon: MessageCircle, badge: true },
  { href: "/results", label: "Results", icon: BarChart3 },
];

export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md safe-bottom"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2" style={{ height: "var(--nav-height)" }}>
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 min-w-[4rem] transition-colors",
                active ? "text-accent" : "text-muted"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                {badge && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
