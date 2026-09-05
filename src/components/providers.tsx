"use client";

import { SWRConfig } from "swr";
import { ThemeProvider } from "@/hooks/useTheme";
import { UnreadProvider } from "@/hooks/useUnread";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { ToastProvider } from "@/components/ui/toast";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { TimezoneSync } from "@/components/timezone-sync";

const swrOptions = {
  revalidateOnFocus: false,
  shouldRetryOnError: false,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrOptions}>
      <ThemeProvider>
        <ToastProvider>
          <UnreadProvider>
            <NotificationsProvider>
              <TimezoneSync />
              <OnboardingGuard>{children}</OnboardingGuard>
            </NotificationsProvider>
          </UnreadProvider>
        </ToastProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
