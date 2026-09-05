"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { estimateStrideLength } from "@/lib/calculations";
import type { Profile } from "@/types/database";

function BodyForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [weight, setWeight] = useState(profile.weight_kg?.toString() ?? "");
  const [height, setHeight] = useState(profile.height_cm?.toString() ?? "");
  const [stride, setStride] = useState(profile.stride_length_cm?.toString() ?? "");
  const supabase = createClient();

  const handleSave = async () => {
    await supabase.from("profiles").update({
      weight_kg: weight ? parseFloat(weight) : null,
      height_cm: height ? parseFloat(height) : null,
      stride_length_cm: stride ? parseFloat(stride) : null,
    }).eq("user_id", profile.user_id);
    onSaved();
  };

  const estimatedStride = height ? estimateStrideLength(parseFloat(height)).toFixed(1) : "—";

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted mb-1 block">Weight (kg)</label>
        <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <div>
        <label className="text-sm text-muted mb-1 block">Height (cm)</label>
        <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
      </div>
      <div>
        <label className="text-sm text-muted mb-1 block">Stride length (cm)</label>
        <Input type="number" value={stride} onChange={(e) => setStride(e.target.value)} />
        <p className="text-muted text-xs mt-1">Estimated from height: {estimatedStride} cm</p>
      </div>
      <Button className="w-full" onClick={handleSave}>Save</Button>
    </div>
  );
}

export default function BodyMeasurementsPage() {
  const { profile, refreshProfile } = useAuth();
  if (!profile) return null;

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Body Measurements</h1>
      </header>
      <BodyForm key={profile.updated_at} profile={profile} onSaved={refreshProfile} />
    </AppShell>
  );
}
