"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { syncProfileTimezone } from "@/lib/profile/timezone";

/** Silently sync device IANA timezone to profiles on login and app load. */
export function TimezoneSync() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user?.id || !profile) return;

    syncProfileTimezone(supabase, user.id, profile.timezone).then((tz) => {
      if (tz !== profile.timezone) {
        refreshProfile();
      }
    });
  }, [user?.id, profile?.timezone, supabase, refreshProfile, profile]);

  return null;
}
