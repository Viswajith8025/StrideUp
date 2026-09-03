"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useChallenge } from "@/hooks/useChallenge";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getLeaderboard } from "@/lib/challenges/service";
import { formatSteps } from "@/utils/formatting";
import { formatDisplayDate } from "@/utils/date";
import type { LeaderboardEntry } from "@/types/database";
import { Trophy } from "lucide-react";

interface ChallengeResult {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  step_goal: number;
  myRank?: number;
  mySteps?: number;
  leaderboard: LeaderboardEntry[];
}

export default function ResultsPage() {
  const { challenges, loading } = useChallenge();
  const { user } = useAuth();
  const [results, setResults] = useState<ChallengeResult[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const data: ChallengeResult[] = [];
      for (const c of challenges.filter((ch) => ch.status === "active" || ch.status === "completed")) {
        const lb = await getLeaderboard(supabase, c.id);
        const myEntry = lb.find((e) => e.user_id === user?.id);
        data.push({
          id: c.id,
          name: c.name,
          status: c.status,
          start_date: c.start_date,
          end_date: c.end_date,
          step_goal: c.step_goal,
          myRank: myEntry?.rank,
          mySteps: myEntry?.total_steps,
          leaderboard: lb,
        });
      }
      setResults(data);
    };
    if (!loading && challenges.length) load();
  }, [challenges, loading, user, supabase]);

  return (
    <AppShell>
      <header className="py-4">
        <h1 className="text-2xl font-bold">Results</h1>
      </header>

      {loading && <p className="text-muted">Loading…</p>}

      {!loading && results.length === 0 && (
        <Card className="text-center py-12 text-muted text-sm">
          <Trophy className="mx-auto mb-3 opacity-50" size={32} />
          No challenge results yet. Join a challenge to see your progress.
        </Card>
      )}

      <div className="space-y-4">
        {results.map((r) => {
          const totalSteps = r.leaderboard.reduce((s, e) => s + e.total_steps, 0);
          const avgDaily = r.leaderboard.length
            ? Math.round(totalSteps / Math.max(1, r.leaderboard.length))
            : 0;
          const bestDay = Math.max(...r.leaderboard.map((e) => e.total_steps), 0);
          const goalRate = r.step_goal > 0 && r.mySteps
            ? Math.min(100, (r.mySteps / r.step_goal) * 100)
            : 0;

          return (
            <Card key={r.id}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{r.name}</h3>
                <span className="text-xs capitalize text-accent">{r.status}</span>
              </div>
              <p className="text-muted text-sm mb-3">
                {formatDisplayDate(r.start_date)} – {formatDisplayDate(r.end_date)}
              </p>
              {r.myRank && (
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div><span className="text-muted">Final rank</span><div className="text-xl font-bold">#{r.myRank}</div></div>
                  <div><span className="text-muted">Total steps</span><div className="text-xl font-bold">{formatSteps(r.mySteps ?? 0)}</div></div>
                  <div><span className="text-muted">Avg daily</span><div className="font-semibold">{formatSteps(avgDaily)}</div></div>
                  <div><span className="text-muted">Goal completion</span><div className="font-semibold">{Math.round(goalRate)}%</div></div>
                </div>
              )}
              <div className="border-t border-border pt-3 space-y-2">
                {r.leaderboard.slice(0, 5).map((e) => (
                  <div key={e.user_id} className="flex justify-between text-sm">
                    <span>#{e.rank} {e.display_name}</span>
                    <span className="font-medium tabular-nums">{formatSteps(e.total_steps)}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
