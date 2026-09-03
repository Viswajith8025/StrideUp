"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

export function useRealtimeChat(roomId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

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
      const enriched: Message[] = [];
      for (const msg of data ?? []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", msg.user_id)
          .single();
        enriched.push({ ...(msg as Message), profile: profile ?? undefined });
      }
      setMessages(enriched);
    }
    setLoading(false);
  }, [roomId, supabase]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("user_id", payload.new.user_id)
            .single();
          setMessages((prev) => [
            ...prev,
            { ...(payload.new as Message), profile: profile ?? undefined },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

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
