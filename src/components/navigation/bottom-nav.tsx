"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, BarChart3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", icon: Home, index: 0 },
  { href: "/challenges", label: "Challenges", icon: Trophy, index: 1, badge: true },
  { href: "/partner", label: "Buddy", icon: Sparkles, index: 2 },
  { href: "/results", label: "Results", icon: BarChart3, index: 3 },
];

export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[var(--app-max)] -translate-x-1/2 border-t border-border/80 bg-background/90 backdrop-blur-xl safe-bottom"
      aria-label="Main navigation"
      role="navigation"
    >
      <ul
        className="flex list-none items-center justify-around px-1 m-0 p-0"
        style={{ height: "var(--nav-height)" }}
      >
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "nav-tab flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 px-2 py-2",
                  active ? "text-foreground" : "text-muted"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative" aria-hidden="true">
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 1.75}
                    className={cn(
                      "transition-[transform,color] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
                      active && "scale-110 text-accent"
                    )}
                  />
                  {badge && unreadCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-[var(--motion-fast)]",
                    active ? "text-accent" : "text-muted"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
