"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { CategoryIcon } from "@/lib/notifications/icons";
import { inferUrlFromNotification } from "@/lib/notifications/service";
import type { Notification } from "@/types/database";
import { formatTimeAgo, toLocalDateString } from "@/utils/date";
import { cn } from "@/lib/utils";

function groupNotifications(items: Notification[]) {
  const today = toLocalDateString();
  const todayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  for (const item of items) {
    const itemDate = item.created_at.slice(0, 10);
    if (itemDate === today) todayItems.push(item);
    else earlierItems.push(item);
  }

  return { todayItems, earlierItems };
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: Notification;
  onOpen: (item: Notification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      role="listitem"
      className="w-full text-left flex gap-3 py-4 border-b border-border min-h-[72px]"
    >
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card">
        <CategoryIcon category={item.category} size={18} className="text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-medium line-clamp-2", !item.read && "text-foreground")}>{item.title}</p>
          {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />}
        </div>
        <p className="text-sm text-muted line-clamp-2 mt-0.5">{item.body}</p>
        <p className="text-xs text-muted mt-1">{formatTimeAgo(item.created_at)}</p>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    items,
    loading,
    isStale,
    hasMore,
    loadMore,
    markRead,
    markAllRead,
    markReadError,
    notificationUnreadCount,
  } = useNotifications();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { todayItems, earlierItems } = groupNotifications(items);

  const handleOpen = useCallback(
    async (item: Notification) => {
      if (!item.read) {
        await markRead(item.id);
      }
      router.push(inferUrlFromNotification(item));
    },
    [markRead, router]
  );

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          setLoadingMore(true);
          loadMore().finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loadingMore]);

  return (
    <AppShell showHeader={false}>
      <header className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/home" aria-label="Back"><ArrowLeft size={24} /></Link>
          <h1 className="text-xl font-bold truncate">Notifications</h1>
        </div>
        {notificationUnreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="shrink-0 text-sm">
            Mark all read
          </Button>
        )}
      </header>

      {isStale && (
        <p className="mb-3 rounded-xl bg-card px-3 py-2 text-sm text-muted">
          Showing cached notifications — connect to refresh.
        </p>
      )}

      {markReadError && (
        <p className="mb-3 rounded-xl bg-card px-3 py-2 text-sm text-amber-400">{markReadError}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-muted">
          <p className="font-medium text-foreground mb-1">No notifications yet</p>
          <p className="text-sm">Goal reminders, challenges, and chat alerts will show up here.</p>
        </div>
      ) : (
        <>
          {todayItems.length > 0 && (
            <section className="mb-4" aria-label="Today's notifications">
              <h2 className="text-sm text-muted mb-1">Today</h2>
              <div role="list">
                {todayItems.map((item) => (
                  <NotificationRow key={item.id} item={item} onOpen={handleOpen} />
                ))}
              </div>
            </section>
          )}
          {earlierItems.length > 0 && (
            <section aria-label="Earlier notifications">
              <h2 className="text-sm text-muted mb-1">Earlier</h2>
              <div role="list">
                {earlierItems.map((item) => (
                  <NotificationRow key={item.id} item={item} onOpen={handleOpen} />
                ))}
              </div>
            </section>
          )}
          <div ref={sentinelRef} className="h-8" />
          {loadingMore && <p className="text-center text-sm text-muted py-2">Loading more…</p>}
        </>
      )}
    </AppShell>
  );
}
