"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getChallenges } from "@/lib/challenges/service";
import type { Challenge } from "@/types/database";

export function useChallenge() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await getChallenges(supabase, user.id);
      setChallenges(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const active = challenges.filter((c) => c.status === "active");
  const upcoming = challenges.filter((c) => c.status === "upcoming");
  const completed = challenges.filter((c) => c.status === "completed");

  return { challenges, active, upcoming, completed, loading, error, refresh };
}
