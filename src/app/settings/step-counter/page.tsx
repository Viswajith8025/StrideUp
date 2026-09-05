"use client";

import { useState } from "react";
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
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import {
  queryMotionPermission,
  requestMotionPermission,
  type MotionPermissionState,
} from "@/lib/steps/providers/browser-motion";
import { useEffect } from "react";

function StepCounterForm({
  profile,
  onComplete,
}: {
  profile: Profile;
  onComplete: () => Promise<void>;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [goal, setGoal] = useState(String(profile.daily_step_goal));
  const [weight, setWeight] = useState(profile.weight_kg?.toString() ?? "");
  const [height, setHeight] = useState(profile.height_cm?.toString() ?? "");
  const [stride, setStride] = useState(profile.stride_length_cm?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [motionPerm, setMotionPerm] = useState<MotionPermissionState>("unknown");
  const [permBusy, setPermBusy] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    void queryMotionPermission().then(setMotionPerm);
  }, []);

  const handleEnableMotion = async () => {
    setPermBusy(true);
    const state = await requestMotionPermission();
    setMotionPerm(state);
    setPermBusy(false);
    if (state === "granted") {
      toast("Motion access enabled for while this app is open.", "success");
    } else if (state === "denied") {
      toast("Motion denied — use manual step entry on Home.", "error");
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    await supabase.from("profiles").update({
      daily_step_goal: parseInt(goal, 10),
      weight_kg: weight ? parseFloat(weight) : null,
      height_cm: height ? parseFloat(height) : null,
      stride_length_cm: stride ? parseFloat(stride) : null,
    }).eq("user_id", profile.user_id);
    await supabase.from("app_settings").update({ step_counter_setup_complete: true }).eq("user_id", profile.user_id);
    await onComplete();
    setSaving(false);
    toast("Setup complete!", "success");
    router.push("/home");
  };

  return (
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

      <div className="surface-raised rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Motion permission</h3>
        <p className="text-xs text-muted leading-relaxed">
          On iOS, motion access must be granted from a real tap. Status:{" "}
          <strong className="text-foreground">{motionPerm}</strong>.
        </p>
        {(motionPerm === "prompt" || motionPerm === "unknown" || motionPerm === "denied") && (
          <Button
            type="button"
            variant="outline"
            className="w-full pressable"
            onClick={handleEnableMotion}
            disabled={permBusy}
          >
            {permBusy ? "Requesting…" : motionPerm === "denied" ? "Try motion again" : "Enable motion (tap)"}
          </Button>
        )}
        {motionPerm === "granted" && (
          <p className="text-xs text-accent">Motion can run while StrideUp is open in the foreground.</p>
        )}
        {motionPerm === "denied" && (
          <p className="text-xs text-muted">
            Denied — use <strong className="text-foreground">Add steps</strong> on Home. You can also use Walk mode
            after enabling motion in browser settings.
          </p>
        )}
      </div>

      <p className="text-muted text-xs">
        Motion counting only works while this tab is open and permission is granted. Manual entry is the reliable path
        on desktop and when motion is denied.
      </p>
      <Button className="w-full" onClick={handleComplete} disabled={saving}>
        {saving ? "Saving…" : "Complete Setup"}
      </Button>
    </div>
  );
}

export default function StepCounterSetupPage() {
  const { profile, refreshProfile } = useAuth();
  const { refreshSettings } = useTheme();
  if (!profile) return null;

  const handleComplete = async () => {
    await refreshProfile();
    await refreshSettings();
  };

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Setup Step Counter</h1>
      </header>
      <p className="text-muted text-xs mb-1">{APP_TAGLINE}</p>
      <p className="text-muted text-sm mb-4">Configure your goals. You can change these anytime in Settings.</p>

      <div className="surface-raised rounded-2xl border border-border p-4 mb-6 space-y-3 text-sm">
        <h2 className="font-semibold text-foreground">What the browser can do</h2>
        <ul className="list-disc pl-5 space-y-2 text-muted leading-relaxed">
          <li>
            <strong className="text-foreground">While StrideUp is open:</strong> motion sensors can estimate steps
            (iOS requires an explicit permission prompt from a tap).
          </li>
          <li>
            <strong className="text-foreground">Not while closed or in the background:</strong> browsers cannot keep
            counting steps like a native fitness app or watch. Gaps are never filled in.
          </li>
          <li>
            <strong className="text-foreground">Walk mode:</strong> keeps the screen awake for a deliberate walk so
            the sensor keeps firing.
          </li>
          <li>
            <strong className="text-foreground">Always available:</strong> manual “Add steps” on Home.
          </li>
        </ul>
      </div>

      <StepCounterForm key={profile.user_id} profile={profile} onComplete={handleComplete} />
    </AppShell>
  );
}
