"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { BrowserMotionProvider } from "@/lib/steps/providers/browser-motion";
import { createClient } from "@/lib/supabase/client";
import { addSteps, recordStepEvent } from "@/lib/steps/service";
import { syncChallengeSteps } from "@/lib/challenges/service";
import { queueActivityUpdate, flushPendingUpdates, getPendingStepsTotal } from "@/lib/offline/sync";
import { toLocalDateString } from "@/utils/date";
import type { Profile } from "@/types/database";

export function useSteps(profile: Profile | null, activeChallengeIds: string[] = []) {
  const [syncing, setSyncing] = useState(false);
  const [motionAvailable, setMotionAvailable] = useState(false);
  const [pendingSteps, setPendingSteps] = useState(0);
  const motionRef = useRef<BrowserMotionProvider | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const motion = new BrowserMotionProvider();
    motionRef.current = motion;
    setMotionAvailable(motion.isAvailable());
    return () => motion.stop();
  }, []);

  const refreshPending = useCallback(async () => {
    if (!profile) return;
    const total = await getPendingStepsTotal(profile.user_id);
    setPendingSteps(total);
  }, [profile]);

  const syncToChallenges = useCallback(async (steps: number) => {
    const today = toLocalDateString();
    for (const challengeId of activeChallengeIds) {
      await syncChallengeSteps(supabase, profile!.user_id, challengeId, today, steps);
    }
  }, [activeChallengeIds, profile, supabase]);

  const flushSteps = useCallback(async (count: number, source: "manual" | "motion") => {
    if (!profile || count <= 0) return;
    setSyncing(true);
    try {
      await addSteps(supabase, profile.user_id, profile, count, source);
      await recordStepEvent(supabase, profile.user_id, count, source);
      await syncToChallenges(count);
      await refreshPending();
    } catch (e) {
      console.error("Failed to sync steps:", e);
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
  }, [profile, supabase, syncToChallenges, refreshPending]);

  useEffect(() => {
    if (!profile) return;
    const motion = motionRef.current;
    if (!motion) return;

    motion.onSteps((steps) => flushSteps(steps, "motion"));
    if (motion.isAvailable()) {
      motion.start().catch(console.error);
    }
    return () => motion.stop();
  }, [profile, flushSteps]);

  useEffect(() => {
    if (!profile) return;

    const tryFlush = () => {
      flushPendingUpdates(supabase, profile, activeChallengeIds).then(refreshPending);
    };

    tryFlush();
    window.addEventListener("online", tryFlush);
    return () => window.removeEventListener("online", tryFlush);
  }, [profile, activeChallengeIds, supabase, refreshPending]);

  const addManualSteps = useCallback(async (count: number) => {
    await flushSteps(count, "manual");
  }, [flushSteps]);

  return { addManualSteps, syncing, motionAvailable, pendingSteps };
}
