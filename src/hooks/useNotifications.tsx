"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnread } from "@/hooks/useUnread";
import type { Notification } from "@/types/database";
import {
  cacheNotifications,
  listNotifications,
  markAllRead as markAllReadService,
  markRead as markReadService,
  readCachedNotifications,
  unreadCount as unreadCountService,
} from "@/lib/notifications/service";
import {
  queueMarkAllRead,
  queueMarkRead,
} from "@/lib/offline/notification-queue";
import { flushPendingNotificationReads } from "@/lib/notifications/offline-sync";

const SYNC_CHANNEL = "strideup-notifications-sync";

interface NotificationsContextValue {
  items: Notification[];
  notificationUnreadCount: number;
  headerBadgeCount: number;
  loading: boolean;
  isStale: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  markReadError: string | null;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { unreadCount: chatUnreadCount } = useUnread();
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<Notification[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{ created_at: string; id: string } | null>(null);
  const [markReadError, setMarkReadError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedUserRef = useRef<string | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const headerBadgeCount = notificationUnreadCount + chatUnreadCount;

  const applyReadLocally = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setNotificationUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const applyReadAllLocally = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setNotificationUnreadCount(0);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setNotificationUnreadCount(0);
      return;
    }
    const count = await unreadCountService(supabase, user.id);
    setNotificationUnreadCount(count);
  }, [supabase, user]);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setHasMore(false);
      setNextCursor(null);
      setLoading(false);
      return;
    }

    if (!navigator.onLine) {
      const cached = readCachedNotifications();
      if (cached) {
        setItems(cached.items);
        setIsStale(true);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsStale(false);
    try {
      const result = await listNotifications(supabase, user.id, { limit: 20 });
      setItems(result.items);
      setNextCursor(result.nextCursor);
      setHasMore(Boolean(result.nextCursor));
      cacheNotifications(result.items);
      await refreshUnreadCount();
    } finally {
      setLoading(false);
    }
  }, [supabase, user, refreshUnreadCount]);

  const loadMore = useCallback(async () => {
    if (!user || !nextCursor || !navigator.onLine) return;
    const result = await listNotifications(supabase, user.id, { cursor: nextCursor, limit: 20 });
    setItems((prev) => [...prev, ...result.items]);
    setNextCursor(result.nextCursor);
    setHasMore(Boolean(result.nextCursor));
  }, [supabase, user, nextCursor]);

  const flushPendingReads = useCallback(async () => {
    if (!user || !navigator.onLine) return;

    const result = await flushPendingNotificationReads(supabase, user.id, {
      onRead: applyReadLocally,
      onReadAll: applyReadAllLocally,
    });

    if (result.error) {
      setMarkReadError(result.error);
    } else {
      setMarkReadError(null);
    }

    await refreshUnreadCount();
  }, [supabase, user, applyReadAllLocally, applyReadLocally, refreshUnreadCount]);

  const markRead = useCallback(async (id: string) => {
    if (!user) return;
    setMarkReadError(null);
    applyReadLocally(id);
    broadcastRef.current?.postMessage({ type: "read", id });

    if (!navigator.onLine) {
      await queueMarkRead(user.id, id);
      setMarkReadError("Offline — read status will sync when you reconnect.");
      return;
    }

    try {
      await markReadService(supabase, user.id, id);
    } catch {
      await queueMarkRead(user.id, id);
      setMarkReadError("Could not sync read status. Will retry when online.");
    }
  }, [supabase, user, applyReadLocally]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setMarkReadError(null);
    applyReadAllLocally();
    broadcastRef.current?.postMessage({ type: "read_all" });

    if (!navigator.onLine) {
      await queueMarkAllRead(user.id);
      setMarkReadError("Offline — read status will sync when you reconnect.");
      return;
    }

    try {
      await markAllReadService(supabase, user.id);
    } catch {
      await queueMarkAllRead(user.id);
      setMarkReadError("Could not sync read status. Will retry when online.");
    }
  }, [supabase, user, applyReadAllLocally]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => {
      flushPendingReads();
      refresh();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushPendingReads, refresh]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(SYNC_CHANNEL);
    broadcastRef.current = bc;

    bc.onmessage = (event) => {
      const data = event.data as { type: string; id?: string };
      if (data.type === "read" && data.id) applyReadLocally(data.id);
      if (data.type === "read_all") applyReadAllLocally();
      if (data.type === "refresh") refreshUnreadCount();
    };

    return () => {
      bc.close();
      broadcastRef.current = null;
    };
  }, [applyReadAllLocally, applyReadLocally, refreshUnreadCount]);

  useEffect(() => {
    if (!user?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        subscribedUserRef.current = null;
      }
      return;
    }

    if (subscribedUserRef.current === user.id && channelRef.current) {
      return;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Notification;
          setItems((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            return [row, ...prev];
          });
          if (!row.read) {
            setNotificationUnreadCount((c) => c + 1);
          }
          broadcastRef.current?.postMessage({ type: "refresh" });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Notification;
          setItems((prev) => prev.map((n) => (n.id === row.id ? row : n)));
          refreshUnreadCount();
        }
      )
      .subscribe();

    channelRef.current = channel;
    subscribedUserRef.current = user.id;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      subscribedUserRef.current = null;
    };
  }, [supabase, user?.id, refreshUnreadCount]);

  const value = useMemo(
    () => ({
      items,
      notificationUnreadCount,
      headerBadgeCount,
      loading,
      isStale,
      hasMore,
      loadMore,
      refresh,
      markRead,
      markAllRead,
      markReadError,
    }),
    [
      items,
      notificationUnreadCount,
      headerBadgeCount,
      loading,
      isStale,
      hasMore,
      loadMore,
      refresh,
      markRead,
      markAllRead,
      markReadError,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
