"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AdminPageData } from "@/lib/admin/types";
import type { Challenge, ChallengeStatus } from "@/types/database";
import {
  exportChallengeLeaderboardAction,
  exportUsersCsvAction,
  regenerateChallengeInvite,
  repairLeaderboards,
  setUserActive,
  setUserRole,
  updateChallengeDetails,
  updateChallengeStatus,
} from "@/app/admin/actions";
import {
  downloadCsv,
  exportLeaderboardToCSV,
  exportUsersToCSV,
} from "@/lib/import-export/admin-export";
import { formatSteps } from "@/utils/formatting";
import { Avatar } from "@/components/ui/avatar";

interface AdminClientProps {
  data: AdminPageData;
}

type PendingAction =
  | { type: "promote"; userId: string; name: string }
  | { type: "demote"; userId: string; name: string }
  | { type: "deactivate"; userId: string; name: string }
  | { type: "activate"; userId: string; name: string }
  | { type: "cancel-challenge"; challengeId: string; name: string }
  | { type: "repair" }
  | null;

export function AdminClient({ data }: AdminClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [editDates, setEditDates] = useState({ start_date: "", end_date: "", step_goal: "" });

  const userSearch = searchParams.get("q") ?? "";
  const userSort = (searchParams.get("sort") as "created_at" | "total_steps") || "created_at";
  const challengeStatus = (searchParams.get("status") as ChallengeStatus | "all") || "all";

  const metrics = data.metrics;

  const pushParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    router.push(`/admin?${params.toString()}`);
  };

  const runConfirmed = () => {
    if (!pending) return;
    setError(null);
    startTransition(async () => {
      try {
        if (pending.type === "promote") await setUserRole(pending.userId, "admin");
        if (pending.type === "demote") await setUserRole(pending.userId, "user");
        if (pending.type === "deactivate") await setUserActive(pending.userId, false);
        if (pending.type === "activate") await setUserActive(pending.userId, true);
        if (pending.type === "cancel-challenge") {
          await updateChallengeStatus(pending.challengeId, "cancelled");
        }
        if (pending.type === "repair") await repairLeaderboards();
        setPending(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  };

  const dialogCopy = useMemo(() => {
    if (!pending) return null;
    switch (pending.type) {
      case "promote":
        return { title: "Promote to admin", description: `Grant admin role to ${pending.name}?`, destructive: false };
      case "demote":
        return { title: "Remove admin", description: `Demote ${pending.name} to user?`, destructive: true };
      case "deactivate":
        return { title: "Deactivate user", description: `${pending.name} will be blocked from the app.`, destructive: true };
      case "activate":
        return { title: "Reactivate user", description: `Restore access for ${pending.name}?`, destructive: false };
      case "cancel-challenge":
        return { title: "Cancel challenge", description: `Cancel "${pending.name}"?`, destructive: true };
      case "repair":
        return { title: "Repair leaderboards", description: "Run reconcile_all_challenge_steps() for all activity?", destructive: false };
      default:
        return null;
    }
  }, [pending]);

  const handleExportUsers = () => {
    startTransition(async () => {
      try {
        const rows = await exportUsersCsvAction();
        downloadCsv("strideup-users.csv", exportUsersToCSV(rows));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Export failed");
      }
    });
  };

  const handleExportLeaderboard = (challengeId: string, name: string) => {
    startTransition(async () => {
      try {
        const rows = await exportChallengeLeaderboardAction(challengeId);
        downloadCsv(`strideup-leaderboard-${name.replace(/\s+/g, "-").toLowerCase()}.csv`, exportLeaderboardToCSV(rows));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Export failed");
      }
    });
  };

  const saveChallengeEdit = () => {
    if (!editingChallenge) return;
    const stepGoal = parseInt(editDates.step_goal, 10);
    if (!editDates.start_date || !editDates.end_date || !stepGoal) return;
    startTransition(async () => {
      try {
        await updateChallengeDetails(editingChallenge.id, {
          start_date: editDates.start_date,
          end_date: editDates.end_date,
          step_goal: stepGoal,
        });
        setEditingChallenge(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  };

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold flex-1">Admin</h1>
        <Button size="sm" variant="outline" onClick={() => setPending({ type: "repair" })}>
          Repair leaderboards
        </Button>
      </header>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400" role="alert">{error}</div>
      )}

      <section className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Card className="text-center p-3"><div className="text-lg font-bold tabular-nums">{metrics.dau_30d}</div><div className="text-muted text-xs">DAU (30d)</div></Card>
        <Card className="text-center p-3"><div className="text-lg font-bold tabular-nums">{formatSteps(metrics.total_steps_this_week)}</div><div className="text-muted text-xs">Steps this week</div></Card>
        <Card className="text-center p-3"><div className="text-lg font-bold tabular-nums">{metrics.active_challenges}</div><div className="text-muted text-xs">Active challenges</div></Card>
        <Card className="text-center p-3"><div className="text-lg font-bold tabular-nums">{metrics.new_signups_this_week}</div><div className="text-muted text-xs">Signups this week</div></Card>
        <Card className="text-center p-3 col-span-2 sm:col-span-1"><div className="text-lg font-bold tabular-nums">{metrics.push_subscription_count}</div><div className="text-muted text-xs">Push subs</div></Card>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-sm text-muted flex-1">Users</h2>
        <Button size="sm" variant="outline" onClick={handleExportUsers} disabled={isPending}>Export CSV</Button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          placeholder="Search display name"
          value={userSearch}
          onChange={(e) => pushParams({ q: e.target.value || undefined, up: "1" })}
          className="flex-1 min-w-[10rem]"
        />
        <select
          className="rounded-full border border-border bg-card px-3 py-2 text-sm"
          value={userSort}
          onChange={(e) => pushParams({ sort: e.target.value, up: "1" })}
        >
          <option value="created_at">Sort: joined</option>
          <option value="total_steps">Sort: total steps</option>
        </select>
      </div>

      <div className="space-y-2 mb-4" role="list" aria-label="Admin users">
        {data.users.users.map((user) => (
          <Card key={user.user_id} role="listitem" className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={user.display_name} src={user.avatar_url} size="sm" />
              <div className="min-w-0">
                <div className="font-medium truncate">{user.display_name}</div>
                <div className="text-muted text-xs capitalize">{user.role}{!user.is_active ? " · inactive" : ""} · {formatSteps(user.total_steps)} steps</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {user.role === "user" ? (
                <Button size="sm" variant="outline" onClick={() => setPending({ type: "promote", userId: user.user_id, name: user.display_name })}>Promote</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setPending({ type: "demote", userId: user.user_id, name: user.display_name })}>Demote</Button>
              )}
              {user.is_active ? (
                <Button size="sm" variant="destructive" onClick={() => setPending({ type: "deactivate", userId: user.user_id, name: user.display_name })}>Deactivate</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setPending({ type: "activate", userId: user.user_id, name: user.display_name })}>Activate</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Pagination
        page={data.users.page}
        total={data.users.total}
        pageSize={data.users.pageSize}
        onChange={(page) => pushParams({ up: String(page) })}
      />

      <div className="mt-8 mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm text-muted flex-1">Challenges</h2>
        <select
          className="rounded-full border border-border bg-card px-3 py-2 text-sm"
          value={challengeStatus}
          onChange={(e) => pushParams({ status: e.target.value === "all" ? undefined : e.target.value, cp: "1" })}
        >
          <option value="all">All statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-2 mb-4">
        {data.challenges.challenges.map((challenge) => (
          <Card key={challenge.id} className="text-sm space-y-2">
            <div className="flex justify-between gap-2">
              <div>
                <div className="font-medium">{challenge.name}</div>
                <div className="text-muted capitalize">{challenge.status} · goal {formatSteps(challenge.step_goal)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => {
                setEditingChallenge(challenge);
                setEditDates({ start_date: challenge.start_date, end_date: challenge.end_date, step_goal: String(challenge.step_goal) });
              }}>Edit</Button>
              {challenge.status !== "cancelled" && (
                <Button size="sm" variant="destructive" onClick={() => setPending({ type: "cancel-challenge", challengeId: challenge.id, name: challenge.name })}>Cancel</Button>
              )}
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => {
                startTransition(async () => {
                  try {
                    await regenerateChallengeInvite(challenge.id);
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Regenerate failed");
                  }
                });
              }}>New invite</Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleExportLeaderboard(challenge.id, challenge.name)}>Export LB</Button>
            </div>
          </Card>
        ))}
      </div>

      <Pagination
        page={data.challenges.page}
        total={data.challenges.total}
        pageSize={data.challenges.pageSize}
        onChange={(page) => pushParams({ cp: String(page) })}
      />

      {editingChallenge && (
        <SheetEditChallenge
          dates={editDates}
          onChange={setEditDates}
          onClose={() => setEditingChallenge(null)}
          onSave={saveChallengeEdit}
          loading={isPending}
        />
      )}

      {dialogCopy && (
        <ConfirmDialog
          open={Boolean(pending)}
          title={dialogCopy.title}
          description={dialogCopy.description}
          destructive={dialogCopy.destructive}
          loading={isPending}
          onConfirm={runConfirmed}
          onClose={() => setPending(null)}
        />
      )}
    </AppShell>
  );
}

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm text-muted">
      <span>Page {page} of {pages} ({total} total)</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

function SheetEditChallenge({
  dates,
  onChange,
  onClose,
  onSave,
  loading,
}: {
  dates: { start_date: string; end_date: string; step_goal: string };
  onChange: (value: { start_date: string; end_date: string; step_goal: string }) => void;
  onClose: () => void;
  onSave: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Edit challenge</h3>
        <div className="space-y-3">
          <Input type="date" value={dates.start_date} onChange={(e) => onChange({ ...dates, start_date: e.target.value })} />
          <Input type="date" value={dates.end_date} onChange={(e) => onChange({ ...dates, end_date: e.target.value })} />
          <Input type="number" placeholder="Step goal" value={dates.step_goal} onChange={(e) => onChange({ ...dates, step_goal: e.target.value })} />
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={onSave} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
