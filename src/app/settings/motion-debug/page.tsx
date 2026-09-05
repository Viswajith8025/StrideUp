"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Square, Circle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { requestMotionPermission } from "@/lib/steps/providers/browser-motion";
import type { AccelSample } from "@/lib/steps/detection/detector";

/**
 * Hidden debug route: record raw DeviceMotionEvent samples to a downloadable JSON trace.
 * Path: /settings/motion-debug
 */
export default function MotionDebugPage() {
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState("Idle");
  const samplesRef = useRef<AccelSample[]>([]);
  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const stop = useCallback(() => {
    if (handlerRef.current) {
      window.removeEventListener("devicemotion", handlerRef.current);
      handlerRef.current = null;
    }
    setCount(samplesRef.current.length);
    setRecording(false);
    setStatus(`Stopped — ${samplesRef.current.length} samples`);
  }, []);

  const start = useCallback(async () => {
    const perm = await requestMotionPermission();
    if (perm !== "granted") {
      setStatus(`Permission: ${perm}`);
      return;
    }
    samplesRef.current = [];
    setCount(0);
    const handler = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (acc?.x == null || acc?.y == null || acc?.z == null) return;
      const t =
        typeof event.timeStamp === "number" && event.timeStamp > 0
          ? event.timeStamp
          : performance.now();
      samplesRef.current.push({ x: acc.x, y: acc.y, z: acc.z, t });
      if (samplesRef.current.length % 10 === 0) {
        setCount(samplesRef.current.length);
      }
    };
    handlerRef.current = handler;
    window.addEventListener("devicemotion", handler);
    setRecording(true);
    setStatus("Recording…");
  }, []);

  useEffect(() => () => stop(), [stop]);

  const download = () => {
    const payload = {
      name: `trace-${Date.now()}`,
      label: "Device capture",
      trueSteps: null,
      expectNearZero: false,
      tolerancePct: 0.2,
      sampleRateHz: null,
      notes: "Recorded from /settings/motion-debug. Label trueSteps before committing as a fixture.",
      samples: samplesRef.current,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = payload.name + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Motion trace recorder</h1>
      </header>
      <p className="text-sm text-muted mb-4 leading-relaxed">
        Hidden debug tool. Records raw <code className="text-foreground">DeviceMotionEvent</code> samples
        for detector fixtures. Walk a known step count, stop, download JSON, set <code>trueSteps</code>,
        and commit under <code>src/lib/steps/detection/__fixtures__/</code>.
      </p>
      <p className="text-sm mb-4" role="status">
        {status} {recording ? `(${count} samples)` : null}
      </p>
      <div className="flex flex-col gap-3">
        {!recording ? (
          <Button className="pressable" onClick={() => void start()}>
            <Circle size={14} className="mr-2" /> Start recording
          </Button>
        ) : (
          <Button variant="outline" className="pressable" onClick={stop}>
            <Square size={14} className="mr-2" /> Stop
          </Button>
        )}
        <Button
          variant="outline"
          className="pressable"
          onClick={download}
          disabled={count === 0}
        >
          <Download size={14} className="mr-2" /> Download JSON
        </Button>
      </div>
    </AppShell>
  );
}
