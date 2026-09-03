"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { AccentColor, AppSettings, ThemeMode } from "@/types/database";
import { applyAccentColor, applyTheme } from "@/lib/theme/constants";
import { createClient } from "@/lib/supabase/client";

interface ThemeContextValue {
  theme: ThemeMode;
  accentColor: AccentColor;
  widgetTheme: ThemeMode;
  settings: AppSettings | null;
  loading: boolean;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setAccentColor: (color: AccentColor) => Promise<void>;
  setWidgetTheme: (theme: ThemeMode) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const refreshSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) setSettings(data as AppSettings);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const theme = settings?.theme ?? "dark";
  const accentColor = settings?.accent_color ?? "cyan";
  const widgetTheme = settings?.widget_theme ?? "dark";

  useEffect(() => {
    applyTheme(theme);
    applyAccentColor(accentColor);
  }, [theme, accentColor]);

  const updateSetting = async (updates: Partial<AppSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("app_settings")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();
    if (data) setSettings(data as AppSettings);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accentColor,
        widgetTheme,
        settings,
        loading,
        setTheme: (t) => updateSetting({ theme: t }),
        setAccentColor: (c) => updateSetting({ accent_color: c }),
        setWidgetTheme: (t) => updateSetting({ widget_theme: t }),
        refreshSettings,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
