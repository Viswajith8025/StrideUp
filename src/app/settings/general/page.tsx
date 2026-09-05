"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import type { AppSettings, Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

function GeneralForm({
  profile,
  settings,
  onSaved,
}: {
  profile: Profile;
  settings: AppSettings;
  onSaved: () => void;
}) {
  const [goal, setGoal] = useState(String(profile.daily_step_goal));
  const [distanceUnit, setDistanceUnit] = useState(settings.distance_unit);
  const [weightUnit, setWeightUnit] = useState(settings.weight_unit);
  const [weekStart, setWeekStart] = useState(String(settings.week_starts_on));
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    await supabase.from("profiles").update({ daily_step_goal: parseInt(goal, 10) }).eq("user_id", profile.user_id);
    await supabase.from("app_settings").update({
      distance_unit: distanceUnit,
      weight_unit: weightUnit,
      week_starts_on: parseInt(weekStart, 10),
    }).eq("user_id", profile.user_id);
    onSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted mb-1 block">Daily step goal</label>
        <Input type="number" value={goal} onChange={(e) => setGoal(e.target.value)} />
      </div>
      <div>
        <label className="text-sm text-muted mb-1 block">Distance unit</label>
        <select value={distanceUnit} onChange={(e) => setDistanceUnit(e.target.value as AppSettings["distance_unit"])} className="w-full h-12 rounded-xl bg-card border border-border px-4">
          <option value="km">Kilometers</option>
          <option value="mi">Miles</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-muted mb-1 block">Weight unit</label>
        <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as AppSettings["weight_unit"])} className="w-full h-12 rounded-xl bg-card border border-border px-4">
          <option value="kg">Kilograms</option>
          <option value="lb">Pounds</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-muted mb-1 block">Week starts on</label>
        <select value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="w-full h-12 rounded-xl bg-card border border-border px-4">
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
        </select>
      </div>
      <Button className="w-full" onClick={handleSave}>{saved ? "Saved!" : "Save"}</Button>
    </div>
  );
}

export default function GeneralSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { settings } = useTheme();
  if (!profile || !settings) return null;

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">General</h1>
      </header>
      <GeneralForm
        key={`${profile.updated_at}-${settings.updated_at}`}
        profile={profile}
        settings={settings}
        onSaved={refreshProfile}
      />
    </AppShell>
  );
}
