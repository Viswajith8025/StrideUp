"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Profile } from "@/types/database";

type ProfileSnippet = Pick<Profile, "display_name" | "avatar_url">;

export function useRealtimeChat(roomId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileCacheRef = useRef<Map<string, ProfileSnippet>>(new Map());
  const supabase = createClient();

  const attachProfiles = useCallback(
    async (rows: Message[]): Promise<Message[]> => {
      const missing = [...new Set(rows.map((row) => row.user_id))].filter(
        (id) => !profileCacheRef.current.has(id)
      );

      if (missing.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", missing);
        for (const profile of profiles ?? []) {
          profileCacheRef.current.set(profile.user_id, {
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          });
        }
      }

      return rows.map((row) => ({
        ...row,
        profile: profileCacheRef.current.get(row.user_id) ?? undefined,
      }));
    },
    [supabase]
  );

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (err) {
      setError(err.message);
    } else {
      setMessages(await attachProfiles((data ?? []) as Message[]));
    }
    setLoading(false);
  }, [attachProfiles, roomId, supabase]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchMessages();
    });
  }, [fetchMessages]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const enriched = await attachProfiles([payload.new as Message]);
          setMessages((prev) => [...prev, enriched[0]]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [attachProfiles, roomId, supabase]);

  const sendMessage = async (text: string, userId: string) => {
    if (!roomId) return;
    const { error: err } = await supabase.from("messages").insert({
      room_id: roomId,
      user_id: userId,
      message: text,
    });
    if (err) throw err;
  };

  const markRead = async (userId: string) => {
    if (!roomId) return;
    await supabase
      .from("chat_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("room_id", roomId)
      .eq("user_id", userId);
  };

  return { messages, loading, error, sendMessage, markRead, refresh: fetchMessages };
}
