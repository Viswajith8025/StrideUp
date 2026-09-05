"use client";

import { Button } from "@/components/ui/button";
import { Footprints, Square, Play } from "lucide-react";

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface WalkModeCardProps {
  active: boolean;
  steps: number;
  elapsedMs: number;
  cadenceSpm: number | null;
  wakeLockActive: boolean;
  wakeLockError: string | null;
  onStart: () => void;
  onStop: () => void;
  busy?: boolean;
}

export function WalkModeCard({
  active,
  steps,
  elapsedMs,
  cadenceSpm,
  wakeLockActive,
  wakeLockError,
  onStart,
  onStop,
  busy,
}: WalkModeCardProps) {
  return (
    <div className="surface-raised mb-4 rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Walk mode</h2>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Keeps the screen awake so the sensor can keep counting. Stops when you leave or hide the tab —
            nothing is invented for the gap.
          </p>
        </div>
        <Footprints size={18} className="text-muted shrink-0" strokeWidth={1.75} aria-hidden />
      </div>

      {active ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold tabular-nums">{steps}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted">Steps</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{formatElapsed(elapsedMs)}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted">Elapsed</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{cadenceSpm ?? "—"}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted">spm</div>
            </div>
          </div>
          <p className="text-[11px] text-muted">
            {wakeLockActive
              ? "Screen wake lock active."
              : wakeLockError ?? "Wake lock inactive — keep the tab visible."}
          </p>
          <Button variant="outline" className="w-full pressable" onClick={onStop} disabled={busy}>
            <Square size={14} className="mr-2" /> Stop walk
          </Button>
        </div>
      ) : (
        <Button className="w-full pressable" onClick={onStart} disabled={busy}>
          <Play size={14} className="mr-2" /> Start walk
        </Button>
      )}
    </div>
  );
}
