"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  BrowserMotionProvider,
  queryMotionPermission,
  requestMotionPermission,
  type MotionPermissionState,
} from "@/lib/steps/providers/browser-motion";
import { createClient } from "@/lib/supabase/client";
import { addSteps, recordStepEvent } from "@/lib/steps/service";
import { queueActivityUpdate, flushPendingUpdates, getPendingStepsTotal } from "@/lib/offline/sync";
import {
  clearWalkSession,
  loadWalkSession,
  saveWalkSession,
  unflushedSteps,
  type WalkSessionRecord,
} from "@/lib/steps/session-store";
import { toLocalDateString } from "@/utils/date";
import type { DailyActivity, Profile } from "@/types/database";

export type MotionLiveStatus =
  | "unsupported"
  | "denied"
  | "prompt"
  | "idle"
  | "counting"
  | "paused"
  | "walk";

export interface UseStepsOptions {
  initialTodayActivity?: DailyActivity | null;
  onStepsSynced?: () => void | Promise<void>;
}

export function useSteps(profile: Profile | null, options: UseStepsOptions = {}) {
  const { onStepsSynced } = options;
  const [syncing, setSyncing] = useState(false);
  const [motionAvailable, setMotionAvailable] = useState(false);
  const [motionActive, setMotionActive] = useState(false);
  const [permission, setPermission] = useState<MotionPermissionState>("unknown");
  const [liveStatus, setLiveStatus] = useState<MotionLiveStatus>("idle");
  const [pendingSteps, setPendingSteps] = useState(0);
  const [walkSteps, setWalkSteps] = useState(0);
  const [walkElapsedMs, setWalkElapsedMs] = useState(0);
  const [walkCadenceSpm, setWalkCadenceSpm] = useState<number | null>(null);
  const [pausedMs, setPausedMs] = useState<number | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockError, setWakeLockError] = useState<string | null>(null);

  const motionRef = useRef<BrowserMotionProvider | null>(null);
  const [isWalkMode, setIsWalkMode] = useState(false);
  const walkModeRef = useRef(false);
  const walkSessionRef = useRef<WalkSessionRecord | null>(null);
  const walkStartedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const motion = new BrowserMotionProvider();
    motionRef.current = motion;
    const available = motion.isAvailable();
    const frame = requestAnimationFrame(() => {
      setMotionAvailable(available);
    });
    void queryMotionPermission().then((p) => {
      setPermission(p);
      if (p === "unsupported") setLiveStatus("unsupported");
      else if (p === "prompt") setLiveStatus("prompt");
    });
    return () => {
      cancelAnimationFrame(frame);
      motion.stop();
      void releaseWakeLock();
    };
  }, []);

  const refreshPending = useCallback(async () => {
    if (!profile) return;
    const total = await getPendingStepsTotal(profile.user_id);
    setPendingSteps(total);
  }, [profile]);

  const flushSteps = useCallback(
    async (count: number, source: "manual" | "motion") => {
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
    },
    [profile, supabase, refreshPending, onStepsSynced]
  );

  const persistSession = useCallback(async () => {
    const rec = walkSessionRef.current;
    if (!rec || !profile) return;
    rec.updatedAt = Date.now();
    await saveWalkSession(rec);
  }, [profile]);

  const markFlushed = useCallback(
    async (count: number) => {
      const rec = walkSessionRef.current;
      if (!rec) return;
      rec.flushedSteps += count;
      rec.updatedAt = Date.now();
      await saveWalkSession(rec);
    },
    []
  );

  const onMotionSteps = useCallback(
    (steps: number) => {
      if (walkModeRef.current && walkSessionRef.current) {
        walkSessionRef.current.accumulatedSteps += steps;
        setWalkSteps(walkSessionRef.current.accumulatedSteps);
        const interval = motionRef.current?.getDetectorState().lastIntervalMs;
        if (interval && interval > 0) {
          setWalkCadenceSpm(Math.round(60000 / interval));
        }
        void persistSession();
      }
      void flushSteps(steps, "motion").then(() => {
        if (walkModeRef.current) void markFlushed(steps);
      });
    },
    [flushSteps, persistSession, markFlushed]
  );

  async function acquireWakeLock(): Promise<boolean> {
    setWakeLockError(null);
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      setWakeLockError("Screen wake lock is not supported in this browser.");
      setWakeLockActive(false);
      return false;
    }
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener("release", () => {
        setWakeLockActive(false);
        wakeLockRef.current = null;
      });
      return true;
    } catch {
      setWakeLockError("Could not keep the screen awake (permission, power saving, or low battery).");
      setWakeLockActive(false);
      return false;
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null;
    setWakeLockActive(false);
  }

  const stopListening = useCallback(() => {
    motionRef.current?.stop();
    setMotionActive(false);
  }, []);

  const startListening = useCallback(async () => {
    const motion = motionRef.current;
    if (!motion || !motion.isAvailable()) return false;
    await motion.start({ permissionAlreadyGranted: true });
    const ok = motion.isRunning();
    setMotionActive(ok);
    return ok;
  }, []);

  const enableMotion = useCallback(async () => {
    const state = await requestMotionPermission();
    setPermission(state);
    if (state !== "granted") {
      setLiveStatus(state === "denied" ? "denied" : "unsupported");
      setMotionActive(false);
      return false;
    }
    motionRef.current?.onSteps(onMotionSteps);
    const ok = await startListening();
    setLiveStatus(ok ? (walkModeRef.current ? "walk" : "counting") : "idle");
    return ok;
  }, [onMotionSteps, startListening]);

  // Reconcile crash-resilient session on load
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const rec = await loadWalkSession(profile.user_id);
      if (cancelled || !rec) return;
      const pending = unflushedSteps(rec);
      if (pending > 0) {
        await flushSteps(pending, "motion");
        rec.flushedSteps = rec.accumulatedSteps;
        await saveWalkSession(rec);
      }
      // Stale walk UI state — clear session after reconcile
      await clearWalkSession(profile.user_id);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, flushSteps]);

  // Passive background counting only when permission already granted (non-iOS)
  useEffect(() => {
    if (!profile) return;
    const motion = motionRef.current;
    if (!motion) return;
    motion.onSteps(onMotionSteps);

    let cancelled = false;
    (async () => {
      const p = await queryMotionPermission();
      if (cancelled) return;
      setPermission(p);
      if (p === "granted") {
        const ok = await startListening();
        if (!cancelled) {
          setLiveStatus(ok ? "counting" : "idle");
        }
      } else if (p === "prompt") {
        setLiveStatus("prompt");
      } else if (p === "unsupported") {
        setLiveStatus("unsupported");
      }
    })();

    return () => {
      cancelled = true;
      stopListening();
      setLiveStatus("idle");
    };
  }, [profile, onMotionSteps, startListening, stopListening]);

  // Visibility: pause detector; do not invent steps for the gap
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (motionRef.current?.isRunning()) {
          pausedAtRef.current = Date.now();
          motionRef.current.stop();
          setMotionActive(false);
          if (walkModeRef.current) {
            setLiveStatus("paused");
            void persistSession();
          } else {
            setLiveStatus("paused");
          }
        }
        void releaseWakeLock();
      } else if (document.visibilityState === "visible") {
        if (pausedAtRef.current != null) {
          setPausedMs(Date.now() - pausedAtRef.current);
          pausedAtRef.current = null;
        }
        if (walkModeRef.current && permission === "granted") {
          void (async () => {
            motionRef.current?.softReset();
            await startListening();
            await acquireWakeLock();
            setLiveStatus("walk");
          })();
        } else if (!walkModeRef.current && permission === "granted") {
          void (async () => {
            motionRef.current?.softReset();
            await startListening();
            setLiveStatus("counting");
          })();
        }
      }
    };

    const onPageHide = () => {
      void persistSession();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [permission, persistSession, startListening]);

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

  const startWalk = useCallback(async () => {
    if (!profile) return false;
    let ok = permission === "granted";
    if (!ok) {
      ok = await enableMotion();
    }
    if (!ok) return false;

    const sessionId = `${Date.now()}`;
    const rec: WalkSessionRecord = {
      userId: profile.user_id,
      sessionId,
      accumulatedSteps: 0,
      flushedSteps: 0,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    walkSessionRef.current = rec;
    walkModeRef.current = true;
    setIsWalkMode(true);
    walkStartedAtRef.current = Date.now();
    setWalkSteps(0);
    setWalkElapsedMs(0);
    setWalkCadenceSpm(null);
    setPausedMs(null);
    await saveWalkSession(rec);

    motionRef.current?.softReset();
    await startListening();
    await acquireWakeLock();
    setLiveStatus("walk");

    if (persistTimerRef.current) clearInterval(persistTimerRef.current);
    persistTimerRef.current = setInterval(() => void persistSession(), 2000);

    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    tickTimerRef.current = setInterval(() => {
      if (walkStartedAtRef.current) {
        setWalkElapsedMs(Date.now() - walkStartedAtRef.current);
      }
    }, 500);

    return true;
  }, [profile, permission, enableMotion, startListening, persistSession]);

  const stopWalk = useCallback(async () => {
    walkModeRef.current = false;
    setIsWalkMode(false);
    if (persistTimerRef.current) clearInterval(persistTimerRef.current);
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    persistTimerRef.current = null;
    tickTimerRef.current = null;
    await persistSession();
    await releaseWakeLock();
    if (profile) await clearWalkSession(profile.user_id);
    walkSessionRef.current = null;
    walkStartedAtRef.current = null;
    setLiveStatus(motionRef.current?.isRunning() ? "counting" : permission === "denied" ? "denied" : "idle");
  }, [persistSession, profile, permission]);

  // Cleanup walk timers on unmount / navigation
  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearInterval(persistTimerRef.current);
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      void releaseWakeLock();
    };
  }, []);

  const addManualSteps = useCallback(
    async (count: number) => {
      await flushSteps(count, "manual");
    },
    [flushSteps]
  );

  const dismissPauseBanner = useCallback(() => setPausedMs(null), []);

  return {
    addManualSteps,
    syncing,
    motionAvailable,
    motionActive,
    pendingSteps,
    permission,
    liveStatus,
    enableMotion,
    startWalk,
    stopWalk,
    walkSteps,
    walkElapsedMs,
    walkCadenceSpm,
    wakeLockActive,
    wakeLockError,
    pausedMs,
    dismissPauseBanner,
    isWalkMode,
  };
}
