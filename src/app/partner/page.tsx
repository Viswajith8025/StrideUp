"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import {
  PARTNER_NAME,
  PARTNER_TAGLINE,
  type PartnerChatMessage,
} from "@/lib/partner/constants";
import {
  clearPartnerMessages,
  loadPartnerMessages,
  savePartnerMessages,
} from "@/lib/partner/storage";
import { formatTimeAgo } from "@/utils/date";

const STARTERS = [
  "I need a pep talk",
  "Celebrate my steps with me",
  "How do I stick to my streak?",
  "I'm feeling tired today",
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PartnerPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<PartnerChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const stored = loadPartnerMessages(user.id);
    const welcome: PartnerChatMessage = {
      id: newId(),
      role: "assistant",
      content: `Hey ${profile?.display_name ?? "friend"} — I'm ${PARTNER_NAME}, your walking buddy. Tell me how the day's going, or ask for a cheer anytime.`,
      createdAt: new Date().toISOString(),
    };
    const next = stored.length === 0 ? [welcome] : stored;
    if (stored.length === 0) savePartnerMessages(user.id, next);
    const id = requestAnimationFrame(() => {
      setMessages(next);
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, [user, profile?.display_name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const persist = useCallback(
    (next: PartnerChatMessage[]) => {
      setMessages(next);
      if (user) savePartnerMessages(user.id, next);
    },
    [user]
  );

  const send = async (content: string) => {
    if (!user || sending) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMsg: PartnerChatMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    persist(nextHistory);
    setText("");
    setSending(true);

    try {
      const contextParts = [
        profile?.display_name ? `Name: ${profile.display_name}` : null,
        profile?.daily_step_goal ? `Daily goal: ${profile.daily_step_goal}` : null,
      ].filter(Boolean);

      const res = await fetch("/api/partner/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          context: contextParts.join(". "),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Could not reach your buddy");
      }
      const assistantMsg: PartnerChatMessage = {
        id: newId(),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };
      persist([...nextHistory, assistantMsg]);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Chat failed", "error");
      persist(messages);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  const handleClear = () => {
    if (!user) return;
    clearPartnerMessages(user.id);
    const welcome: PartnerChatMessage = {
      id: newId(),
      role: "assistant",
      content: `Fresh start. What's on your mind, ${profile?.display_name ?? "friend"}?`,
      createdAt: new Date().toISOString(),
    };
    persist([welcome]);
  };

  return (
    <AppShell>
      <header className="flex items-center gap-3 py-4 border-b border-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
          <Sparkles className="text-accent" size={18} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{PARTNER_NAME}</h1>
          <p className="text-xs text-muted">{PARTNER_TAGLINE}</p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="pressable p-2 text-muted hover:text-foreground"
          aria-label="Clear chat"
        >
          <Trash2 size={18} strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!ready && <p className="text-muted text-center text-sm">Loading…</p>}
          {ready &&
            messages.map((msg) => {
              const isMe = msg.role === "user";
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  {!isMe && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                      <Sparkles className="text-accent" size={14} />
                    </div>
                  )}
                  {isMe && (
                    <Avatar
                      name={profile?.display_name ?? "You"}
                      src={profile?.avatar_url}
                      size="sm"
                    />
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMe ? "bg-accent text-accent-foreground" : "bg-card"
                    }`}
                  >
                    {!isMe && (
                      <div className="text-xs font-medium mb-1 opacity-70">{PARTNER_NAME}</div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className="text-[10px] opacity-60 mt-1">{formatTimeAgo(msg.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          {sending && (
            <p className="text-muted text-sm px-2">{PARTNER_NAME} is typing…</p>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 2 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={sending}
                onClick={() => void send(starter)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent"
              >
                {starter}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 py-3 border-t border-border safe-bottom">
          <Input
            placeholder={`Message ${PARTNER_NAME}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1"
            disabled={sending}
            maxLength={2000}
          />
          <Button type="submit" disabled={sending || !text.trim()}>
            Send
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
