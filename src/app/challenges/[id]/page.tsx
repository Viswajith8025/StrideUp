"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PageLoader } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChallengeActivityFeed } from "@/components/challenges/activity-feed";
import { ChallengeChatPanel } from "@/components/challenges/challenge-chat-panel";
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
import { cn } from "@/lib/utils";
import type { Challenge, LeaderboardEntry, ChallengeActivityEvent } from "@/types/database";
import type { CheerEmoji } from "@/lib/cheers/constants";
import { ArrowLeft, Share2, Trophy, Activity, MessageCircle } from "lucide-react";

type DetailTab = "leaderboard" | "activity" | "chat";

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
  const [tab, setTab] = useState<DetailTab>("leaderboard");
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

  if (loading)
    return (
      <AppShell showNav={false}>
        <PageLoader />
      </AppShell>
    );
  if (!challenge)
    return (
      <AppShell showNav={false}>
        <div className="py-20 text-center">Challenge not found</div>
      </AppShell>
    );

  const tabs: { id: DetailTab; label: string; icon: typeof Trophy }[] = [
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ];

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/challenges" className="pressable">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate">{challenge.name}</h1>
        <button onClick={shareInvite} aria-label="Share invite" className="pressable text-muted-foreground">
          <Share2 size={20} />
        </button>
      </header>

      <Card className="surface-raised mb-4 border border-border/80">
        <p className="text-muted text-sm mb-2">{challenge.description}</p>
        <div className="flex gap-4 text-sm">
          <span>
            {formatDisplayDate(challenge.start_date)} – {formatDisplayDate(challenge.end_date)}
          </span>
          <span>{remainingDays(challenge.end_date)} days left</span>
        </div>
        <div className="mt-3 text-sm">
          Goal: {formatSteps(challenge.step_goal)} · {memberCount} members
        </div>
        {myEntry && (
          <div className="mt-3 flex gap-4">
            <span>
              Your steps: <strong>{formatSteps(myEntry.total_steps)}</strong>
            </span>
            <span>
              Rank: <strong>#{myEntry.rank}</strong>
            </span>
          </div>
        )}
      </Card>

      {!isMember ? (
        <Button className="w-full mb-4 pressable" onClick={handleJoin}>
          Join Challenge
        </Button>
      ) : (
        <Button variant="outline" className="w-full mb-4" onClick={() => setShowLeaveConfirm(true)}>
          Leave Challenge
        </Button>
      )}

      <div
        className="mb-4 flex gap-1 rounded-2xl border border-border bg-card p-1"
        role="tablist"
        aria-label="Challenge sections"
      >
        {tabs.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={tab === tabId}
            onClick={() => setTab(tabId)}
            className={cn(
              "pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-[color,background-color,transform] duration-[var(--motion-fast)]",
              tab === tabId
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-foreground"
            )}
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div
        key={tab}
        className="animate-rise mb-6"
        role="tabpanel"
      >
        {tab === "leaderboard" && (
          <Card className="surface-raised space-y-3 border border-border/80">
            {leaderboard.map((entry) => (
              <div key={entry.user_id} className="flex items-center gap-3">
                <span className="text-muted w-6 font-medium" data-testid="leaderboard-rank">
                  #{entry.rank}
                </span>
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
            {leaderboard.length === 0 && (
              <EmptyState
                icon={Trophy}
                title="No participants yet"
                description="Be the first on the board — join and start logging steps."
                className="border-0 bg-transparent shadow-none py-8"
              />
            )}
          </Card>
        )}

        {tab === "activity" && (
          <Card className="surface-raised border border-border/80">
            <ChallengeActivityFeed events={activity} />
          </Card>
        )}

        {tab === "chat" && (
          <Card className="surface-raised border border-border/80">
            <ChallengeChatPanel roomId={chatRoomId} isMember={isMember} />
          </Card>
        )}
      </div>

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
