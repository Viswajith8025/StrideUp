export const APP_NAME = "StrideUp";
export const APP_TAGLINE = "Every Step. One Level Up.";
export const APP_DESCRIPTION =
  "StrideUp is a mobile-first step tracking and fitness challenge PWA that helps users track their daily steps, set goals, monitor progress, maintain streaks, compete in challenges, view leaderboards, and stay connected with their group.";
export const APP_VERSION = "1.0.0";
export const APP_BUILD = "1";

export const BRAND = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  description: APP_DESCRIPTION,
  supportEmail: "support@strideup.app",
  contactEmail: "hello@strideup.app",
  privacyEmail: "privacy@strideup.app",
  legalEmail: "legal@strideup.app",
  website: "https://strideup.app",
  blogUrl: "https://strideup.app/blog",
  themeStorageKey: "strideup-theme",
} as const;

export function getShareText(): string {
  return `${APP_NAME} — ${APP_TAGLINE}`;
}
