"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PageLoader } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { getChallenge, getLeaderboard, joinChallenge, leaveChallenge, getMemberCount } from "@/lib/challenges/service";
import { useAuth } from "@/hooks/useAuth";
import { formatDisplayDate, remainingDays } from "@/utils/date";
import { formatSteps } from "@/utils/formatting";
import type { Challenge, LeaderboardEntry } from "@/types/database";
import { ArrowLeft, Share2 } from "lucide-react";

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const c = await getChallenge(supabase, id);
      setChallenge(c);
      const lb = await getLeaderboard(supabase, id);
      setLeaderboard(lb);
      const count = await getMemberCount(supabase, id);
      setMemberCount(count);
      if (user) {
        const { data } = await supabase.from("challenge_members").select("id").eq("challenge_id", id).eq("user_id", user.id).maybeSingle();
        setIsMember(!!data);
      }
      const { data: room } = await supabase.from("chat_rooms").select("id").eq("challenge_id", id).maybeSingle();
      setChatRoomId(room?.id ?? null);
      setLoading(false);
    };
    load();
  }, [id, user, supabase]);

  const handleJoin = async () => {
    if (!user || !id) return;
    await joinChallenge(supabase, user.id, id);
    setIsMember(true);
    const lb = await getLeaderboard(supabase, id);
    setLeaderboard(lb);
  };

  const handleLeave = async () => {
    if (!user || !id) return;
    await leaveChallenge(supabase, user.id, id);
    router.push("/challenges");
  };

  const shareInvite = async () => {
    if (!challenge?.invite_token) return;
    const url = `${window.location.origin}/invite/${challenge.invite_token}`;
    if (navigator.share) {
      await navigator.share({ title: challenge.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Invite link copied!");
    }
  };

  const myEntry = leaderboard.find((e) => e.user_id === user?.id);

  if (loading) return <AppShell showNav={false}><PageLoader /></AppShell>;
  if (!challenge) return <AppShell showNav={false}><div className="py-20 text-center">Challenge not found</div></AppShell>;

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/challenges"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold flex-1 truncate">{challenge.name}</h1>
        <button onClick={shareInvite} aria-label="Share invite"><Share2 size={20} className="text-accent" /></button>
      </header>

      <Card className="mb-4">
        <p className="text-muted text-sm mb-2">{challenge.description}</p>
        <div className="flex gap-4 text-sm">
          <span>{formatDisplayDate(challenge.start_date)} – {formatDisplayDate(challenge.end_date)}</span>
          <span>{remainingDays(challenge.end_date)} days left</span>
        </div>
        <div className="mt-3 text-sm">Goal: {formatSteps(challenge.step_goal)} · {memberCount} members</div>
        {myEntry && (
          <div className="mt-3 flex gap-4">
            <span>Your steps: <strong>{formatSteps(myEntry.total_steps)}</strong></span>
            <span>Rank: <strong>#{myEntry.rank}</strong></span>
          </div>
        )}
      </Card>

      {!isMember ? (
        <Button className="w-full mb-4" onClick={handleJoin}>Join Challenge</Button>
      ) : (
        <Button variant="outline" className="w-full mb-4" onClick={handleLeave}>Leave Challenge</Button>
      )}

      <h2 className="text-sm text-muted mb-3">Leaderboard</h2>
      <Card className="mb-6 space-y-3">
        {leaderboard.map((entry) => (
          <div key={entry.user_id} className="flex items-center gap-3">
            <span className="text-muted w-6 font-medium" data-testid="leaderboard-rank">#{entry.rank}</span>
            <Avatar name={entry.display_name} src={entry.avatar_url} size="sm" />
            <span className="flex-1 font-medium">{entry.display_name}</span>
            <span className="font-bold tabular-nums">{formatSteps(entry.total_steps)}</span>
          </div>
        ))}
        {leaderboard.length === 0 && <p className="text-muted text-sm text-center py-4">No participants yet</p>}
      </Card>

      {chatRoomId ? (
        <Link href={`/chats/${chatRoomId}`} className="text-accent text-sm">Open challenge chat →</Link>
      ) : (
        <p className="text-muted text-sm">Chat room will be available after joining</p>
      )}
    </AppShell>
  );
}
