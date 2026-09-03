"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { APP_TAGLINE } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";

export default function StepCounterSetupPage() {
  const { profile, refreshProfile } = useAuth();
  const { refreshSettings } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const [goal, setGoal] = useState("6000");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [stride, setStride] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      setGoal(String(profile.daily_step_goal));
      setWeight(profile.weight_kg?.toString() ?? "");
      setHeight(profile.height_cm?.toString() ?? "");
      setStride(profile.stride_length_cm?.toString() ?? "");
    }
  }, [profile]);

  const handleComplete = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase.from("profiles").update({
      daily_step_goal: parseInt(goal, 10),
      weight_kg: weight ? parseFloat(weight) : null,
      height_cm: height ? parseFloat(height) : null,
      stride_length_cm: stride ? parseFloat(stride) : null,
    }).eq("user_id", profile.user_id);
    await supabase.from("app_settings").update({ step_counter_setup_complete: true }).eq("user_id", profile.user_id);
    await refreshProfile();
    await refreshSettings();
    setSaving(false);
    toast("Setup complete!", "success");
    router.push("/home");
  };

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Setup Step Counter</h1>
      </header>
      <p className="text-muted text-sm mb-2">{APP_TAGLINE}</p>
      <p className="text-muted text-sm mb-6">Configure your step tracking preferences. You can always change these later.</p>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted mb-1 block">Daily step goal</label>
          <Input type="number" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted mb-1 block">Weight (kg)</label>
          <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted mb-1 block">Height (cm)</label>
          <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted mb-1 block">Stride length (cm) — optional</label>
          <Input type="number" value={stride} onChange={(e) => setStride(e.target.value)} placeholder="Auto-estimated from height" />
        </div>
        <p className="text-muted text-xs">Browser step counting uses motion sensors when available. Manual entry and import are always available as fallbacks.</p>
        <Button className="w-full" onClick={handleComplete} disabled={saving}>
          {saving ? "Saving…" : "Complete Setup"}
        </Button>
      </div>
    </AppShell>
  );
}
