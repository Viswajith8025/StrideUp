"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChallenge } from "@/hooks/useChallenge";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { createChallenge } from "@/lib/challenges/service";
import { challengeSchema } from "@/lib/validation/schemas";
import { formatDisplayDate, remainingDays } from "@/utils/date";
import { formatSteps } from "@/utils/formatting";
import { Plus, Users, Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";

function ChallengeCard({ challenge, memberCount }: { challenge: { id: string; name: string; description: string | null; start_date: string; end_date: string; step_goal: number; status: string }; memberCount?: number }) {
  return (
    <Link href={`/challenges/${challenge.id}`}>
      <Card className="hover:bg-card-elevated transition-colors">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{challenge.name}</h3>
          <span className="text-xs rounded-full bg-accent/20 text-accent px-2 py-0.5 capitalize">{challenge.status}</span>
        </div>
        {challenge.description && <p className="text-muted text-sm mb-3 line-clamp-2">{challenge.description}</p>}
        <div className="flex gap-4 text-sm text-muted">
          <span>{formatDisplayDate(challenge.start_date)} – {formatDisplayDate(challenge.end_date)}</span>
        </div>
        <div className="flex justify-between mt-3 text-sm">
          <span>Goal: {formatSteps(challenge.step_goal)} steps</span>
          {challenge.status === "active" && <span>{remainingDays(challenge.end_date)} days left</span>}
          {memberCount !== undefined && (
            <span className="flex items-center gap-1"><Users size={14} /> {memberCount}</span>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function ChallengesPage() {
  const { active, upcoming, completed, loading, error, refresh } = useChallenge();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", start_date: "", end_date: "", step_goal: "10000" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  const handleCreate = async () => {
    if (!user || creating) return;
    const input = {
      name: form.name,
      description: form.description || undefined,
      start_date: form.start_date,
      end_date: form.end_date,
      step_goal: parseInt(form.step_goal, 10),
    };
    const parsed = challengeSchema.safeParse(input);
    if (!parsed.success) {
      setCreateError(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createChallenge(supabase, user.id, parsed.data);
      setShowCreate(false);
      setForm({ name: "", description: "", start_date: "", end_date: "", step_goal: "10000" });
      refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create challenge");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        <Button size="icon" onClick={() => setShowCreate(true)} aria-label="Create challenge" className="pressable">
          <Plus size={20} />
        </Button>
      </header>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {loading && <p className="text-muted">Loading…</p>}

      <section className="space-y-4 mb-8">
        <h2 className="section-title">Active</h2>
        {active.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No active challenges"
            description="Create a challenge or join a friend’s invite to compete."
            actionLabel="Create challenge"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          active.map((c) => <ChallengeCard key={c.id} challenge={c} />)
        )}
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="section-title">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Nothing upcoming"
            description="Schedule a challenge with a future start date."
            className="py-8"
          />
        ) : (
          upcoming.map((c) => <ChallengeCard key={c.id} challenge={c} />)
        )}
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="section-title">Completed</h2>
        {completed.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No completed challenges"
            description="Finished challenges will land here with your results."
            className="py-8"
          />
        ) : (
          completed.map((c) => <ChallengeCard key={c.id} challenge={c} />)
        )}
      </section>

      <Sheet open={showCreate} onClose={() => setShowCreate(false)} title="Create Challenge">
        <div className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <Input type="number" placeholder="Step goal" value={form.step_goal} onChange={(e) => setForm({ ...form, step_goal: e.target.value })} />
          {createError && <p className="text-red-400 text-sm">{createError}</p>}
          <Button className="w-full pressable" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
