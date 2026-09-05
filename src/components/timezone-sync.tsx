"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { syncProfileTimezone } from "@/lib/profile/timezone";

/** Silently sync device IANA timezone to profiles on login and app load. */
export function TimezoneSync() {
  const { user, profile, refreshProfile } = useAuth();
  const attemptedForUser = useRef<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!user?.id || !profile) return;
    if (attemptedForUser.current === user.id) return;
    attemptedForUser.current = user.id;

    syncProfileTimezone(supabase, user.id, profile.timezone)
      .then((tz) => {
        if (tz !== profile.timezone) {
          void refreshProfile();
        }
      })
      .catch(() => {
        // Don't retry in a loop if the column/update fails
      });
  }, [user?.id, profile, supabase, refreshProfile]);

  return null;
}
