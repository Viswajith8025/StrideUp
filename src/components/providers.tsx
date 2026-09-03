"use client";

import { ThemeProvider } from "@/hooks/useTheme";
import { UnreadProvider } from "@/hooks/useUnread";
import { ToastProvider } from "@/components/ui/toast";
import { OnboardingGuard } from "@/components/onboarding-guard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <UnreadProvider>
          <OnboardingGuard>{children}</OnboardingGuard>
        </UnreadProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
