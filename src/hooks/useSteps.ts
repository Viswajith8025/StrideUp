"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { BrowserMotionProvider } from "@/lib/steps/providers/browser-motion";
import { createClient } from "@/lib/supabase/client";
import { addSteps, recordStepEvent } from "@/lib/steps/service";
import { queueActivityUpdate, flushPendingUpdates, getPendingStepsTotal } from "@/lib/offline/sync";
import { toLocalDateString } from "@/utils/date";
import type { DailyActivity, Profile } from "@/types/database";

export interface UseStepsOptions {
  initialTodayActivity?: DailyActivity | null;
  onStepsSynced?: () => void | Promise<void>;
}

export function useSteps(profile: Profile | null, options: UseStepsOptions = {}) {
  const { onStepsSynced } = options;
  const [syncing, setSyncing] = useState(false);
  const [motionAvailable] = useState(
    () => typeof window !== "undefined" && "DeviceMotionEvent" in window
  );
  const [pendingSteps, setPendingSteps] = useState(0);
  const motionRef = useRef<BrowserMotionProvider | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const motion = new BrowserMotionProvider();
    motionRef.current = motion;
    return () => motion.stop();
  }, []);

  const refreshPending = useCallback(async () => {
    if (!profile) return;
    const total = await getPendingStepsTotal(profile.user_id);
    setPendingSteps(total);
  }, [profile]);

  const flushSteps = useCallback(async (count: number, source: "manual" | "motion") => {
    if (!profile || count <= 0) return;
    setSyncing(true);
    try {
      await addSteps(supabase, profile.user_id, profile, count, source);
      await recordStepEvent(supabase, profile.user_id, count, source);
      await refreshPending();
      await onStepsSynced?.();
    } catch {
      await queueActivityUpdate({
        userId: profile.user_id,
        date: toLocalDateString(),
        steps: count,
        source,
      });
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  }, [profile, supabase, refreshPending, onStepsSynced]);

  useEffect(() => {
    if (!profile) return;
    const motion = motionRef.current;
    if (!motion) return;

    motion.onSteps((steps) => flushSteps(steps, "motion"));
    if (motion.isAvailable()) {
      motion.start().catch(() => undefined);
    }
    return () => motion.stop();
  }, [profile, flushSteps]);

  useEffect(() => {
    if (!profile) return;

    const tryFlush = () => {
      flushPendingUpdates(supabase, profile).then(async () => {
        await refreshPending();
        await onStepsSynced?.();
      });
    };

    tryFlush();
    window.addEventListener("online", tryFlush);
    return () => window.removeEventListener("online", tryFlush);
  }, [profile, supabase, refreshPending, onStepsSynced]);

  const addManualSteps = useCallback(async (count: number) => {
    await flushSteps(count, "manual");
  }, [flushSteps]);

  return { addManualSteps, syncing, motionAvailable, pendingSteps };
}
