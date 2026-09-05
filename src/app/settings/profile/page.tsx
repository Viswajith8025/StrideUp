"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

export default function ProfileSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile || !displayName.trim()) return;
    setSaving(true);
    await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("user_id", profile.user_id);
    refreshProfile();
    setSaving(false);
    toast("Profile updated", "success");
  };

  if (!profile) return null;

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Profile</h1>
      </header>
      <div className="flex flex-col items-center mb-8">
        <AvatarUpload
          userId={profile.user_id}
          displayName={displayName || "User"}
          avatarUrl={avatarUrl}
          onUploaded={(url) => {
            setAvatarUrl(url);
            refreshProfile();
          }}
        />
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted mb-1 block">Display name</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </AppShell>
  );
}
