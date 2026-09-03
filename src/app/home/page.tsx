"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MoreVertical, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { CircularProgress } from "@/components/dashboard/circular-progress";
import { StatsRow } from "@/components/dashboard/stats-cards";
import { PeriodToggle } from "@/components/dashboard/period-toggle";
import { ActivityChart } from "@/components/charts/activity-chart";
import { LeaderboardPreview } from "@/components/leaderboard/leaderboard-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { PageLoader } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useSteps } from "@/hooks/useSteps";
import { createClient } from "@/lib/supabase/client";
import { getActivityRange } from "@/lib/steps/service";
import { getLeaderboard } from "@/lib/challenges/service";
import { calculateDailyStreak, calculateGoalPercentage, calculateWeeklyStats } from "@/lib/calculations";
import { toLocalDateString, getWeekRange, getMonthRange, getRelativeDayLabel, parseLocalDate, subDays, addDays } from "@/utils/date";
import { formatSteps, formatDistance } from "@/utils/formatting";
import type { DailyActivity, LeaderboardEntry } from "@/types/database";
import { useChallenge } from "@/hooks/useChallenge";
import { cn } from "@/lib/utils";

type Period = "D" | "W" | "M";

export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { settings } = useTheme();
  const { active } = useChallenge();
  const activeChallengeIds = active.map((c) => c.id);
  const { addManualSteps, syncing, motionAvailable, pendingSteps } = useSteps(profile, activeChallengeIds);
  const [period, setPeriod] = useState<Period>("D");
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [streakActivities, setStreakActivities] = useState<DailyActivity[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(toLocalDateString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddSteps, setShowAddSteps] = useState(false);
  const [manualSteps, setManualSteps] = useState("");
  const supabase = createClient();

  const goal = profile?.daily_step_goal ?? 6000;
  const distanceUnit = settings?.distance_unit ?? "km";
  const today = toLocalDateString();
  const isToday = selectedDate === today;

  const loadData = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);
    setError(null);
    try {
      const weekStartsOn = settings?.week_starts_on ?? 0;
      let start: string, end: string;

      if (period === "D") {
        start = end = selectedDate;
      } else if (period === "W") {
        const range = getWeekRange(parseLocalDate(selectedDate), weekStartsOn);
        start = range.start;
        end = range.end;
      } else {
        const range = getMonthRange(parseLocalDate(selectedDate));
        start = range.start;
        end = range.end;
      }

      const data = await getActivityRange(supabase, user.id, start, end);
      setActivities(data);

      const streakStart = toLocalDateString(subDays(new Date(), 90));
      const streakData = await getActivityRange(supabase, user.id, streakStart, today);
      setStreakActivities(streakData);

      if (active[0]) {
        const lb = await getLeaderboard(supabase, active[0].id);
        setLeaderboard(lb);
      } else {
        setLeaderboard([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [user, profile, period, selectedDate, settings, active, supabase, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayActivity = activities.find((a) => a.date === selectedDate);
  const steps = period === "D"
    ? (todayActivity?.steps ?? 0)
    : activities.reduce((s, a) => s + a.steps, 0);

  const weekStartsOn = settings?.week_starts_on ?? 0;
  const weekRange = getWeekRange(parseLocalDate(selectedDate), weekStartsOn);
  const weekStats = calculateWeeklyStats(activities, weekRange.start, weekRange.end, goal);
  const monthRange = getMonthRange(parseLocalDate(selectedDate));
  const monthStats = calculateWeeklyStats(activities, monthRange.start, monthRange.end, goal);

  const streak = calculateDailyStreak(streakActivities, goal, today);

  const displayCalories = period === "D" ? (todayActivity?.calories ?? 0) : activities.reduce((s, a) => s + a.calories, 0);
  const displayDistance = period === "D"
    ? (todayActivity?.distance_km ?? 0)
    : activities.reduce((s, a) => s + a.distance_km, 0);
  const displayMinutes = period === "D"
    ? (todayActivity?.active_minutes ?? 0)
    : activities.reduce((s, a) => s + a.active_minutes, 0);

  const chartData = (period === "M" ? monthStats : weekStats).dailyData.map((d) => ({
    date: d.date,
    steps: d.steps,
  }));

  const handleAddSteps = async () => {
    const count = parseInt(manualSteps, 10);
    if (isNaN(count) || count <= 0) return;
    await addManualSteps(count);
    setManualSteps("");
    setShowAddSteps(false);
    loadData();
  };

  if (authLoading) return <PageLoader />;

  return (
    <AppShell>
      <header className="flex items-center justify-between py-4">
        <Link href="/settings/profile" aria-label="Profile">
          <Avatar name={profile?.display_name ?? "User"} src={profile?.avatar_url} />
        </Link>
        <PeriodToggle value={period} onChange={setPeriod} />
        <Link href="/settings" aria-label="Settings">
          <MoreVertical size={24} className="text-muted" />
        </Link>
      </header>

      {pendingSteps > 0 && (
        <div className="mb-3 rounded-xl bg-accent/10 px-4 py-2 text-sm text-accent text-center">
          {pendingSteps} steps pending sync
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-400 text-sm">
          {error}
          <button onClick={loadData} className="ml-2 underline">Try again</button>
        </div>
      )}

      <section className="flex flex-col items-center py-4 relative w-full">
        {period === "D" && (
          <div className="flex w-full items-center justify-between mb-2 px-2">
            <button
              onClick={() => setSelectedDate(toLocalDateString(subDays(parseLocalDate(selectedDate), 1)))}
              className="text-muted p-1"
              aria-label="Previous day"
            >
              <ChevronLeft size={20} />
            </button>
            {!isToday && (
              <button onClick={() => setSelectedDate(today)} className="text-accent text-xs font-medium">
                Today
              </button>
            )}
            <button
              onClick={() => !isToday && setSelectedDate(toLocalDateString(addDays(parseLocalDate(selectedDate), 1)))}
              className={cn("p-1", isToday ? "invisible" : "text-muted")}
              aria-label="Next day"
              disabled={isToday}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
        <CircularProgress
          value={calculateGoalPercentage(steps, period === "D" ? goal : goal * (period === "W" ? 7 : 30))}
          label={period === "D" ? getRelativeDayLabel(selectedDate) : period === "W" ? "This Week" : "This Month"}
          sublabel={formatSteps(steps)}
          goalLabel={period === "D" ? `of ${formatSteps(goal)} steps` : `${formatSteps(period === "W" ? weekStats.averageSteps : monthStats.averageSteps)} avg/day`}
        />
        {syncing && <p className="text-muted text-xs mt-2">Syncing…</p>}
        {!motionAvailable && period === "D" && isToday && (
          <p className="text-muted text-xs mt-2 text-center">Motion tracking unavailable — use + to add steps</p>
        )}
      </section>

      <section className="mb-6">
        <StatsRow
          streak={streak}
          calories={displayCalories}
          distance={formatDistance(displayDistance, distanceUnit)}
          distanceUnit={distanceUnit}
          activeMinutes={displayMinutes}
        />
      </section>

      <section className="mb-6">
        {loading ? <PageLoader /> : <ActivityChart data={chartData} goal={goal} />}
      </section>

      <section className="mb-6">
        <h2 className="text-sm text-muted mb-3">Leaderboard</h2>
        {leaderboard.length > 0 ? (
          <LeaderboardPreview entries={leaderboard} currentUserId={user?.id} challengeId={active[0]?.id} />
        ) : (
          <div className="rounded-2xl bg-card p-6 text-center text-muted text-sm">
            No active challenges. <Link href="/challenges" className="text-accent">Join one</Link>
          </div>
        )}
      </section>

      <Sheet open={showAddSteps} onClose={() => setShowAddSteps(false)} title="Add Steps">
        <Input type="number" placeholder="Number of steps" value={manualSteps} onChange={(e) => setManualSteps(e.target.value)} />
        <Button className="w-full mt-4" onClick={handleAddSteps} disabled={syncing}>
          {syncing ? "Adding…" : "Add"}
        </Button>
      </Sheet>

      <button
        onClick={() => setShowAddSteps(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg"
        aria-label="Add steps"
      >
        <Plus size={28} />
      </button>
    </AppShell>
  );
}
