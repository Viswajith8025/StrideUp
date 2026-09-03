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
import { Plus, Users } from "lucide-react";

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
  const supabase = createClient();

  const handleCreate = async () => {
    if (!user) return;
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
    await createChallenge(supabase, user.id, parsed.data);
    setShowCreate(false);
    refresh();
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold">Challenges</h1>
        <Button size="icon" onClick={() => setShowCreate(true)} aria-label="Create challenge">
          <Plus size={20} />
        </Button>
      </header>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {loading && <p className="text-muted">Loading…</p>}

      <section className="space-y-4 mb-8">
        <h2 className="text-sm text-muted uppercase tracking-wide">Active</h2>
        {active.length === 0 ? (
          <Card className="text-center text-muted text-sm py-8">
            No active challenges. Create or join a challenge to get started.
          </Card>
        ) : (
          active.map((c) => <ChallengeCard key={c.id} challenge={c} />)
        )}
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-sm text-muted uppercase tracking-wide">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted text-sm">No upcoming challenges</p>
        ) : (
          upcoming.map((c) => <ChallengeCard key={c.id} challenge={c} />)
        )}
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-sm text-muted uppercase tracking-wide">Completed</h2>
        {completed.length === 0 ? (
          <p className="text-muted text-sm">No completed challenges yet</p>
        ) : (
          completed.map((c) => <ChallengeCard key={c.id} challenge={c} />)
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-h-[80vh] overflow-y-auto rounded-t-2xl bg-card p-6 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create Challenge</h3>
            <div className="space-y-3">
              <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              <Input type="number" placeholder="Step goal" value={form.step_goal} onChange={(e) => setForm({ ...form, step_goal: e.target.value })} />
              {createError && <p className="text-red-400 text-sm">{createError}</p>}
              <Button className="w-full" onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
