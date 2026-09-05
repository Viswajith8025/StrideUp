"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { MoreVertical, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { CircularProgress } from "@/components/dashboard/circular-progress";
import { StreakBadge } from "@/components/dashboard/streak-badge";
import { StatsRow } from "@/components/dashboard/stats-cards";
import { PeriodToggle } from "@/components/dashboard/period-toggle";
import { ChartPlaceholder } from "@/components/charts/chart-placeholder";
import { LeaderboardPreview } from "@/components/leaderboard/leaderboard-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useSteps } from "@/hooks/useSteps";
import { createClient } from "@/lib/supabase/client";
import { getActivityRange } from "@/lib/steps/service";
import { calculateGoalPercentage, calculateWeeklyStats } from "@/lib/calculations";
import {
  type HomePageData,
  type HomePeriod,
  resolveActivityRange,
} from "@/lib/home/types";
import { computeStreakSummary } from "@/lib/home/streak";
import { homeActivityKey } from "@/lib/swr/keys";
import {
  addDays,
  getMonthRange,
  getRelativeDayLabel,
  getWeekRange,
  parseLocalDate,
  subDays,
  toLocalDateString,
} from "@/utils/date";
import { formatSteps, formatDistance } from "@/utils/formatting";
import type { DailyActivity } from "@/types/database";
import { cn } from "@/lib/utils";

const ActivityChart = dynamic(
  () => import("@/components/charts/activity-chart").then((m) => m.ActivityChart),
  { loading: () => <ChartPlaceholder />, ssr: false }
);

function mergeTodayIntoStreak(
  streakActivities: DailyActivity[],
  todayActivity: DailyActivity | null,
  today: string
): DailyActivity[] {
  if (!todayActivity) return streakActivities;
  const withoutToday = streakActivities.filter((a) => a.date !== today);
  return [...withoutToday, todayActivity].sort((a, b) => a.date.localeCompare(b.date));
}

interface HomeClientProps {
  initialData: HomePageData;
}

export function HomeClient({ initialData }: HomeClientProps) {
  const {
    userId,
    profile,
    settings,
    today,
    goal,
    todayActivity: initialTodayActivity,
    streakActivities,
    periodRanges,
    leaderboard,
    activeChallengeId,
  } = initialData;

  const supabase = useMemo(() => createClient(), []);
  const weekStartsOn = settings.week_starts_on ?? 0;
  const distanceUnit = settings.distance_unit ?? "km";

  const [period, setPeriod] = useState<HomePeriod>("D");
  const [selectedDate, setSelectedDate] = useState(today);
  const [showAddSteps, setShowAddSteps] = useState(false);
  const [manualSteps, setManualSteps] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [sessionCache, setSessionCache] = useState(
    () => new Map(periodRanges.map((range) => [range.key, range.activities]))
  );

  const range = resolveActivityRange(period, selectedDate, weekStartsOn);
  const cachedActivities = sessionCache.get(range.key);

  const { data: activities, mutate: mutateActivities } = useSWR(
    homeActivityKey(userId, range.start, range.end),
    async () => {
      const data = await getActivityRange(supabase, userId, range.start, range.end);
      setSessionCache((prev) => new Map(prev).set(range.key, data));
      return data;
    },
    {
      fallbackData: cachedActivities,
      revalidateOnFocus: false,
      revalidateOnMount: !cachedActivities,
      revalidateIfStale: false,
      onError: () => setRangeError("Failed to load activity"),
    }
  );

  const revalidateCurrentRange = useCallback(async () => {
    setRangeError(null);
    const fresh = await getActivityRange(supabase, userId, range.start, range.end);
    setSessionCache((prev) => new Map(prev).set(range.key, fresh));
    await mutateActivities(fresh, { revalidate: false });
    return fresh;
  }, [supabase, userId, range.start, range.end, range.key, mutateActivities]);

  const { addManualSteps, syncing, motionAvailable, pendingSteps } = useSteps(profile, {
    initialTodayActivity,
    onStepsSynced: () => {
      void revalidateCurrentRange();
    },
  });

  const isToday = selectedDate === today;
  const activityList = useMemo(() => activities ?? [], [activities]);

  const todayActivity = useMemo(() => {
    if (period === "D" && selectedDate === today) {
      return activityList.find((a) => a.date === today) ?? initialTodayActivity;
    }
    return activityList.find((a) => a.date === selectedDate) ?? null;
  }, [activityList, period, selectedDate, today, initialTodayActivity]);

  const streakStats = useMemo(() => {
    const merged = mergeTodayIntoStreak(
      streakActivities,
      period === "D" && isToday ? todayActivity : null,
      today
    );
    return computeStreakSummary(merged, goal, today);
  }, [streakActivities, todayActivity, period, isToday, goal, today]);

  const steps =
    period === "D"
      ? (todayActivity?.steps ?? 0)
      : activityList.reduce((sum, row) => sum + row.steps, 0);

  const weekRange = getWeekRange(parseLocalDate(selectedDate), weekStartsOn);
  const weekStats = calculateWeeklyStats(activityList, weekRange.start, weekRange.end, goal);
  const monthRange = getMonthRange(parseLocalDate(selectedDate));
  const monthStats = calculateWeeklyStats(activityList, monthRange.start, monthRange.end, goal);

  const displayCalories =
    period === "D"
      ? (todayActivity?.calories ?? 0)
      : activityList.reduce((sum, row) => sum + row.calories, 0);
  const displayDistance =
    period === "D"
      ? (todayActivity?.distance_km ?? 0)
      : activityList.reduce((sum, row) => sum + row.distance_km, 0);
  const displayMinutes =
    period === "D"
      ? (todayActivity?.active_minutes ?? 0)
      : activityList.reduce((sum, row) => sum + row.active_minutes, 0);

  const chartData = (period === "M" ? monthStats : weekStats).dailyData.map((row) => ({
    date: row.date,
    steps: row.steps,
  }));

  const handleAddSteps = async () => {
    const count = parseInt(manualSteps, 10);
    if (isNaN(count) || count <= 0) return;
    await addManualSteps(count);
    setManualSteps("");
    setShowAddSteps(false);
  };

  const handlePeriodChange = (next: HomePeriod) => {
    setRangeError(null);
    setPeriod(next);
  };

  const handlePreviousDay = () => {
    setRangeError(null);
    setSelectedDate(toLocalDateString(subDays(parseLocalDate(selectedDate), 1)));
  };

  const handleNextDay = () => {
    if (isToday) return;
    setRangeError(null);
    setSelectedDate(toLocalDateString(addDays(parseLocalDate(selectedDate), 1)));
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between py-4">
        <Link href="/settings/profile" aria-label="Profile">
          <Avatar name={profile.display_name ?? "User"} src={profile.avatar_url} />
        </Link>
        <PeriodToggle value={period} onChange={handlePeriodChange} />
        <Link href="/settings" aria-label="Settings">
          <MoreVertical size={24} className="text-muted" />
        </Link>
      </header>

      {pendingSteps > 0 && (
        <div className="mb-3 rounded-xl bg-accent/10 px-4 py-2 text-sm text-accent text-center">
          {pendingSteps} steps pending sync
        </div>
      )}

      {rangeError && (
        <div className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-400 text-sm">
          {rangeError}
          <button onClick={() => revalidateCurrentRange()} className="ml-2 underline">
            Try again
          </button>
        </div>
      )}

      <section className="flex flex-col items-center py-4 relative w-full">
        {period === "D" && (
          <div className="flex w-full items-center justify-between mb-2 px-2">
            <button
              onClick={handlePreviousDay}
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
              onClick={handleNextDay}
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
          label={
            period === "D"
              ? getRelativeDayLabel(selectedDate)
              : period === "W"
                ? "This Week"
                : "This Month"
          }
          sublabel={formatSteps(steps)}
          goalLabel={
            period === "D"
              ? `of ${formatSteps(goal)} steps`
              : `${formatSteps(period === "W" ? weekStats.averageSteps : monthStats.averageSteps)} avg/day`
          }
        />
        {syncing && <p className="text-muted text-xs mt-2">Syncing…</p>}
        {!motionAvailable && period === "D" && isToday && (
          <p className="text-muted text-xs mt-2 text-center">
            Motion tracking unavailable — use + to add steps
          </p>
        )}
        {period === "D" && isToday && (
          <StreakBadge
            className="mt-4"
            currentStreak={streakStats.currentStreak}
            longestStreak={streakStats.longestStreak}
            goalHits={streakStats.goalHits}
          />
        )}
      </section>

      <section className="mb-6">
        <StatsRow
          calories={displayCalories}
          distance={formatDistance(displayDistance, distanceUnit)}
          distanceUnit={distanceUnit}
          activeMinutes={displayMinutes}
        />
      </section>

      <section className="mb-6">
        <ActivityChart data={chartData} goal={goal} />
      </section>

      <section className="mb-6">
        <h2 className="text-sm text-muted mb-3">Leaderboard</h2>
        {leaderboard.length > 0 ? (
          <LeaderboardPreview
            entries={leaderboard}
            currentUserId={userId}
            challengeId={activeChallengeId ?? undefined}
          />
        ) : (
          <div className="rounded-2xl bg-card p-6 text-center text-muted text-sm">
            No active challenges. <Link href="/challenges" className="text-accent">Join one</Link>
          </div>
        )}
      </section>

      <Sheet open={showAddSteps} onClose={() => setShowAddSteps(false)} title="Add Steps">
        <Input
          type="number"
          placeholder="Number of steps"
          value={manualSteps}
          onChange={(e) => setManualSteps(e.target.value)}
        />
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
