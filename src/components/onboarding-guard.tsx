"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const SETUP_PATH = "/settings/step-counter";
const EXEMPT_PATHS = ["/login", "/signup", "/forgot-password", SETUP_PATH, "/invite"];

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading || settingsLoading || !user) return;
    if (EXEMPT_PATHS.some((p) => pathname.startsWith(p))) return;
    if (settings && !settings.step_counter_setup_complete) {
      router.replace(SETUP_PATH);
    }
  }, [user, settings, authLoading, settingsLoading, pathname, router]);

  return <>{children}</>;
}
