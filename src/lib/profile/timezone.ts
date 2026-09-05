import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeviceTimezone } from "@/utils/date";

export { getDeviceTimezone };

export async function syncProfileTimezone(
  supabase: SupabaseClient,
  userId: string,
  storedTimezone?: string | null
): Promise<string> {
  const deviceTz = getDeviceTimezone();
  if (deviceTz !== storedTimezone) {
    await supabase.from("profiles").update({ timezone: deviceTz }).eq("user_id", userId);
  }
  return deviceTz;
}

export const PROFILE_TIMEZONE_OPTIONS = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;
