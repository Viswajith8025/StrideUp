"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UnreadContextValue {
  unreadCount: number;
  refresh: () => void;
}

const UnreadContext = createContext<UnreadContextValue>({ unreadCount: 0, refresh: () => {} });

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const { data: memberships } = await supabase
      .from("chat_members")
      .select("room_id, last_read_at")
      .eq("user_id", user.id);

    let count = 0;
    for (const m of memberships ?? []) {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("created_at")
        .eq("room_id", m.room_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMsg && (!m.last_read_at || new Date(lastMsg.created_at) > new Date(m.last_read_at))) {
        count++;
      }
    }
    setUnreadCount(count);
  }, [user, supabase]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <UnreadContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
