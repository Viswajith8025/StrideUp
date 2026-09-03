"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { estimateStrideLength } from "@/lib/calculations";

export default function BodyMeasurementsPage() {
  const { profile, refreshProfile } = useAuth();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [stride, setStride] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      setWeight(profile.weight_kg?.toString() ?? "");
      setHeight(profile.height_cm?.toString() ?? "");
      setStride(profile.stride_length_cm?.toString() ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    await supabase.from("profiles").update({
      weight_kg: weight ? parseFloat(weight) : null,
      height_cm: height ? parseFloat(height) : null,
      stride_length_cm: stride ? parseFloat(stride) : null,
    }).eq("user_id", profile.user_id);
    refreshProfile();
  };

  const estimatedStride = height ? estimateStrideLength(parseFloat(height)).toFixed(1) : "—";

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Body Measurements</h1>
      </header>
      <p className="text-muted text-sm mb-6">Used for distance and calorie estimates. Not medical-grade.</p>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted mb-1 block">Weight (kg)</label>
          <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted mb-1 block">Height (cm)</label>
          <Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted mb-1 block">Stride length (cm)</label>
          <Input type="number" step="0.1" value={stride} onChange={(e) => setStride(e.target.value)} placeholder={`Estimated: ${estimatedStride}`} />
        </div>
        <Button className="w-full" onClick={handleSave}>Save</Button>
      </div>
    </AppShell>
  );
}
