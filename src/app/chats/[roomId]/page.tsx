"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/hooks/useAuth";
import { messageSchema } from "@/lib/validation/schemas";
import { formatTimeAgo } from "@/utils/date";
import { ArrowLeft } from "lucide-react";

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { messages, loading, error, sendMessage, markRead } = useRealtimeChat(roomId ?? null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && roomId) markRead(user.id);
  }, [user, roomId, messages.length, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = messageSchema.safeParse({ message: text.trim() });
    if (!parsed.success) return;
    setSending(true);
    try {
      await sendMessage(parsed.data.message, user.id);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4 border-b border-border">
        <Link href="/chats"><ArrowLeft size={24} /></Link>
        <h1 className="text-lg font-semibold">Chat</h1>
      </header>

      <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {loading && <p className="text-muted text-center">Loading messages…</p>}
          {error && <p className="text-red-400 text-center text-sm">{error}</p>}
          {!loading && messages.length === 0 && (
            <p className="text-muted text-center text-sm py-8">No messages yet. Say hello!</p>
          )}
          {messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                {!isMe && <Avatar name={msg.profile?.display_name ?? "User"} src={msg.profile?.avatar_url} size="sm" />}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? "bg-accent text-accent-foreground" : "bg-card"}`}>
                  {!isMe && <div className="text-xs font-medium mb-1 opacity-70">{msg.profile?.display_name}</div>}
                  <p className="text-sm">{msg.message}</p>
                  <div className="text-[10px] opacity-60 mt-1">{formatTimeAgo(msg.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2 py-3 border-t border-border safe-bottom">
          <Input
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !text.trim()}>Send</Button>
        </form>
      </div>
    </AppShell>
  );
}
