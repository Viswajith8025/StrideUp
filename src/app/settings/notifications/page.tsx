"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import type { AppSettings } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

type NotificationPrefs = Pick<
  AppSettings,
  | "notifications_enabled"
  | "daily_goal_notifications"
  | "challenge_notifications"
  | "chat_notifications"
  | "streak_notifications"
>;

function NotificationPrefsForm({
  userId,
  settings,
}: {
  userId: string;
  settings: NotificationPrefs;
}) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    notifications_enabled: settings.notifications_enabled,
    daily_goal_notifications: settings.daily_goal_notifications,
    challenge_notifications: settings.challenge_notifications,
    chat_notifications: settings.chat_notifications,
    streak_notifications: settings.streak_notifications,
  });
  const supabase = createClient();

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const enableBrowserNotifications = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setPrefs((p) => ({ ...p, notifications_enabled: true }));
        toast("Notifications enabled", "success");
      }
    }
  };

  const handleSave = async () => {
    await supabase.from("app_settings").update(prefs).eq("user_id", userId);
    toast("Preferences saved", "success");
  };

  const items = [
    { key: "daily_goal_notifications" as const, label: "Daily goal reminder" },
    { key: "challenge_notifications" as const, label: "Challenge notifications" },
    { key: "chat_notifications" as const, label: "Chat notifications" },
    { key: "streak_notifications" as const, label: "Streak notifications" },
  ];

  return (
    <>
      {!prefs.notifications_enabled && (
        <div className="rounded-2xl bg-card p-4 mb-6">
          <p className="text-sm text-muted mb-3">Enable notifications to receive reminders and updates.</p>
          <Button onClick={enableBrowserNotifications}>Enable Notifications</Button>
        </div>
      )}

      <div className="space-y-1">
        {items.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-4 border-b border-border">
            <span>{label}</span>
            <Switch checked={prefs[key]} onChange={() => toggle(key)} label={label} />
          </div>
        ))}
      </div>
      <Button className="w-full mt-6" onClick={handleSave}>Save</Button>
    </>
  );
}

export default function NotificationsSettingsPage() {
  const { settings } = useTheme();
  const { user } = useAuth();
  if (!settings || !user) return null;

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Notifications</h1>
      </header>
      <NotificationPrefsForm key={settings.updated_at} userId={user.id} settings={settings} />
    </AppShell>
  );
}
