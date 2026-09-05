"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", profile.user_id);
    setSaving(false);
    if (error) {
      toast(error.message || "Failed to save profile", "error");
      return;
    }
    onSaved();
    toast("Profile updated", "success");
  };

  return (
    <>
      <div className="flex flex-col items-center mb-8">
        <AvatarUpload
          userId={profile.user_id}
          displayName={displayName || "User"}
          avatarUrl={avatarUrl}
          onUploaded={(url) => {
            setAvatarUrl(url);
            onSaved();
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
    </>
  );
}

export default function ProfileSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  if (!profile) return null;

  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Profile</h1>
      </header>
      <ProfileForm key={`${profile.user_id}-${profile.updated_at}`} profile={profile} onSaved={refreshProfile} />
    </AppShell>
  );
}
