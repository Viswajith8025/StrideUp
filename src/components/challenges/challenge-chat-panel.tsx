"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/hooks/useAuth";
import { messageSchema } from "@/lib/validation/schemas";
import { formatTimeAgo } from "@/utils/date";
import { MessageCircle } from "lucide-react";

interface ChallengeChatPanelProps {
  roomId: string | null;
  isMember: boolean;
}

export function ChallengeChatPanel({ roomId, isMember }: ChallengeChatPanelProps) {
  const { user } = useAuth();
  const { messages, loading, error, sendMessage, markRead } = useRealtimeChat(roomId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && roomId) markRead(user.id);
  }, [user, roomId, messages.length, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isMember) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Join to chat"
        description="Become a member of this challenge to join the conversation."
      />
    );
  }

  if (!roomId) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Chat not ready"
        description="The challenge chat room will appear once setup finishes."
      />
    );
  }

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
    <div className="flex flex-col" style={{ minHeight: "22rem" }}>
      <div className="flex-1 space-y-3 overflow-y-auto py-2 max-h-[50vh]">
        {loading && <p className="text-muted text-center text-sm">Loading messages…</p>}
        {error && <p className="text-red-400 text-center text-sm">{error}</p>}
        {!loading && messages.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="Say hello and get the challenge chat started."
            className="py-8"
          />
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {!isMe && (
                <Avatar name={msg.profile?.display_name ?? "User"} src={msg.profile?.avatar_url} size="sm" />
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMe ? "bg-accent text-accent-foreground" : "surface-raised"
                }`}
              >
                {!isMe && (
                  <div className="text-xs font-medium mb-1 opacity-70">{msg.profile?.display_name}</div>
                )}
                <p className="text-sm">{msg.message}</p>
                <div className="text-[10px] opacity-60 mt-1">{formatTimeAgo(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-2 border-t border-border pt-3">
        <Input
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !text.trim()} className="pressable">
          Send
        </Button>
      </form>
    </div>
  );
}
