import type { AccentColor } from "@/types/database";
import { BRAND } from "@/lib/brand";

export { APP_NAME, APP_TAGLINE, APP_DESCRIPTION, APP_VERSION, APP_BUILD } from "@/lib/brand";

export const ACCENT_COLORS: Record<AccentColor, { main: string; muted: string; foreground: string }> = {
  red: { main: "#ef4444", muted: "#7f1d1d", foreground: "#ffffff" },
  yellow: { main: "#eab308", muted: "#713f12", foreground: "#000000" },
  green: { main: "#22c55e", muted: "#14532d", foreground: "#000000" },
  cyan: { main: "#22d3ee", muted: "#164e63", foreground: "#000000" },
  purple: { main: "#a855f7", muted: "#581c87", foreground: "#ffffff" },
  pink: { main: "#ec4899", muted: "#831843", foreground: "#ffffff" },
};

export function applyAccentColor(color: AccentColor) {
  const palette = ACCENT_COLORS[color];
  document.documentElement.style.setProperty("--accent", palette.main);
  document.documentElement.style.setProperty("--accent-muted", palette.muted);
  document.documentElement.style.setProperty("--accent-foreground", palette.foreground);
}

export function applyTheme(theme: "system" | "dark" | "light") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  let resolved: "light" | "dark";
  if (theme === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } else {
    resolved = theme;
  }
  root.classList.add(resolved);
  try {
    localStorage.setItem(BRAND.themeStorageKey, theme);
  } catch { /* ignore */ }
}
