"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeAgo } from "@/utils/date";
import { MessageCircle, Sparkles } from "lucide-react";
import { PARTNER_NAME, PARTNER_TAGLINE } from "@/lib/partner/constants";

interface ChatRoomItem {
  id: string;
  name: string;
  challenge_id: string;
  challenge_name: string;
  last_message?: string;
  last_message_at?: string;
  unread: number;
}

export default function ChatsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: memberships } = await supabase
        .from("chat_members")
        .select("room_id, last_read_at, chat_rooms(id, name, challenge_id, challenges(name))")
        .eq("user_id", user.id);

      const items: ChatRoomItem[] = [];
      for (const m of memberships ?? []) {
        const room = m.chat_rooms as unknown as { id: string; name: string; challenge_id: string; challenges: { name: string } };
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("message, created_at")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let unread = 0;
        if (lastMsg && m.last_read_at && new Date(lastMsg.created_at) > new Date(m.last_read_at)) {
          unread = 1;
        } else if (lastMsg && !m.last_read_at) {
          unread = 1;
        }

        items.push({
          id: room.id,
          name: room.name,
          challenge_id: room.challenge_id,
          challenge_name: room.challenges?.name ?? "Challenge",
          last_message: lastMsg?.message,
          last_message_at: lastMsg?.created_at,
          unread,
        });
      }
      setRooms(items);
      setLoading(false);
    };
    load();
  }, [user, supabase]);

  return (
    <AppShell>
      <header className="py-4">
        <h1 className="text-2xl font-bold">Chats</h1>
      </header>

      <Link href="/partner" className="block mb-4">
        <Card className="flex items-center gap-3 border border-accent/25 bg-accent/5 hover:bg-accent/10 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
            <Sparkles className="text-accent" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{PARTNER_NAME}</div>
            <p className="text-muted text-sm truncate">{PARTNER_TAGLINE} — chat anytime</p>
          </div>
        </Card>
      </Link>

      {loading && <p className="text-muted">Loading…</p>}

      {!loading && rooms.length === 0 && (
        <Card className="text-center py-12 text-muted text-sm">
          <MessageCircle className="mx-auto mb-3 opacity-50" size={32} />
          No conversations yet. Join a challenge to start chatting.
        </Card>
      )}

      <div className="space-y-2">
        {rooms.map((room) => (
          <Link key={room.id} href={`/chats/${room.id}`}>
            <Card className="flex items-center gap-3 hover:bg-card-elevated transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                <MessageCircle className="text-accent" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{room.challenge_name}</div>
                {room.last_message && (
                  <p className="text-muted text-sm truncate">{room.last_message}</p>
                )}
              </div>
              <div className="text-right">
                {room.last_message_at && (
                  <span className="text-muted text-xs">{formatTimeAgo(room.last_message_at)}</span>
                )}
                {room.unread > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {room.unread}
                  </span>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
