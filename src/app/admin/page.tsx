"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Challenge } from "@/types/database";

export default function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState({ users: 0, activities: 0 });
  const supabase = createClient();

  useEffect(() => {
    if (profile?.role !== "admin") return;
    const load = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setUsers((profiles ?? []) as Profile[]);
      const { data: chals } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
      setChallenges((chals ?? []) as Challenge[]);
      const { count: actCount } = await supabase.from("daily_activity").select("*", { count: "exact", head: true });
      setStats({ users: profiles?.length ?? 0, activities: actCount ?? 0 });
    };
    load();
  }, [profile, supabase]);

  if (profile?.role !== "admin") {
    return (
      <AppShell showNav={false}>
        <div className="py-20 text-center text-muted">Admin access required</div>
      </AppShell>
    );
  }

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Admin</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="text-center"><div className="text-2xl font-bold">{stats.users}</div><div className="text-muted text-sm">Users</div></Card>
        <Card className="text-center"><div className="text-2xl font-bold">{stats.activities}</div><div className="text-muted text-sm">Activities</div></Card>
      </div>

      <h2 className="text-sm text-muted mb-3">Users</h2>
      <div className="space-y-2 mb-6">
        {users.map((u) => (
          <Card key={u.id} className="flex justify-between text-sm">
            <span>{u.display_name}</span>
            <span className="text-muted capitalize">{u.role}</span>
          </Card>
        ))}
      </div>

      <h2 className="text-sm text-muted mb-3">Challenges</h2>
      <div className="space-y-2">
        {challenges.map((c) => (
          <Card key={c.id} className="text-sm">
            <div className="font-medium">{c.name}</div>
            <div className="text-muted capitalize">{c.status}</div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
