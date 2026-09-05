"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PageLoader } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChallengeActivityFeed } from "@/components/challenges/activity-feed";
import { CheerControl } from "@/components/leaderboard/cheer-control";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import {
  getChallenge,
  getLeaderboard,
  getChallengeActivity,
  joinChallenge,
  leaveChallenge,
  getMemberCount,
} from "@/lib/challenges/service";
import { sendCheer } from "@/lib/cheers/service";
import { useAuth } from "@/hooks/useAuth";
import { formatDisplayDate, remainingDays, toLocalDateString } from "@/utils/date";
import { formatSteps } from "@/utils/formatting";
import type { Challenge, LeaderboardEntry, ChallengeActivityEvent } from "@/types/database";
import type { CheerEmoji } from "@/lib/cheers/constants";
import { ArrowLeft, Share2 } from "lucide-react";

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<ChallengeActivityEvent[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const supabase = createClient();

  const refreshActivity = useCallback(async () => {
    if (!id) return;
    const events = await getChallengeActivity(supabase, id);
    setActivity(events);
  }, [id, supabase]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const c = await getChallenge(supabase, id);
      setChallenge(c);
      const lb = await getLeaderboard(supabase, id);
      setLeaderboard(lb);
      const count = await getMemberCount(supabase, id);
      setMemberCount(count);
      await refreshActivity();
      if (user) {
        const { data } = await supabase
          .from("challenge_members")
          .select("id")
          .eq("challenge_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsMember(!!data);
      }
      const { data: room } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("challenge_id", id)
        .maybeSingle();
      setChatRoomId(room?.id ?? null);
      setLoading(false);
    };
    load();
  }, [id, user, supabase, refreshActivity]);

  const handleJoin = async () => {
    if (!user || !id) return;
    await joinChallenge(supabase, user.id, id);
    setIsMember(true);
    const lb = await getLeaderboard(supabase, id);
    setLeaderboard(lb);
    await refreshActivity();
  };

  const handleLeave = async () => {
    if (!user || !id) return;
    setLeaving(true);
    try {
      await leaveChallenge(supabase, user.id, id);
      router.push("/challenges");
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const shareInvite = async () => {
    if (!challenge?.invite_token) return;
    const url = `${window.location.origin}/invite/${challenge.invite_token}`;
    if (navigator.share) {
      await navigator.share({ title: challenge.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast("Invite link copied!", "success");
    }
  };

  const handleCheer = async (toUserId: string, emoji: CheerEmoji) => {
    if (!user || !id) return;
    await sendCheer(supabase, {
      challengeId: id,
      fromUserId: user.id,
      toUserId,
      emoji,
      date: toLocalDateString(),
    });
    await refreshActivity();
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
        <Button variant="outline" className="w-full mb-4" onClick={() => setShowLeaveConfirm(true)}>
          Leave Challenge
        </Button>
      )}

      <h2 className="text-sm text-muted mb-3">Leaderboard</h2>
      <Card className="mb-6 space-y-3">
        {leaderboard.map((entry) => (
          <div key={entry.user_id} className="flex items-center gap-3">
            <span className="text-muted w-6 font-medium" data-testid="leaderboard-rank">#{entry.rank}</span>
            <Avatar name={entry.display_name} src={entry.avatar_url} size="sm" />
            <span className="flex-1 font-medium truncate">{entry.display_name}</span>
            {isMember && user && entry.user_id !== user.id && (
              <CheerControl
                onCheer={(emoji) => handleCheer(entry.user_id, emoji)}
                disabled={!isMember}
              />
            )}
            <span className="font-bold tabular-nums">{formatSteps(entry.total_steps)}</span>
          </div>
        ))}
        {leaderboard.length === 0 && <p className="text-muted text-sm text-center py-4">No participants yet</p>}
      </Card>

      <h2 className="text-sm text-muted mb-3">Activity</h2>
      <Card className="mb-6">
        <ChallengeActivityFeed events={activity} />
      </Card>

      {chatRoomId ? (
        <Link href={`/chats/${chatRoomId}`} className="text-accent text-sm">Open challenge chat →</Link>
      ) : (
        <p className="text-muted text-sm">Chat room will be available after joining</p>
      )}

      <ConfirmDialog
        open={showLeaveConfirm}
        title="Leave challenge?"
        description="You will lose your place on the leaderboard and stop receiving challenge updates."
        confirmLabel="Leave"
        destructive
        loading={leaving}
        onConfirm={handleLeave}
        onClose={() => setShowLeaveConfirm(false)}
      />
    </AppShell>
  );
}
