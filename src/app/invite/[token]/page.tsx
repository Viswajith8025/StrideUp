"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getChallengeByToken, joinChallenge } from "@/lib/challenges/service";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { APP_NAME } from "@/lib/brand";
import { PageLoader } from "@/components/ui/skeleton";
import type { Challenge } from "@/types/database";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      try {
        const c = await getChallengeByToken(supabase, token);
        setChallenge(c);
      } catch {
        setError("Invalid or expired invitation");
      }
      setLoading(false);
    };
    if (token) load();
  }, [token, supabase]);

  const handleJoin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }
    if (!challenge) return;
    await joinChallenge(supabase, user.id, challenge.id);
    router.push(`/challenges/${challenge.id}`);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      {error ? (
        <div className="text-center">
          <BrandLogo size="sm" className="mb-6" />
          <p className="text-red-400">{error}</p>
        </div>
      ) : challenge ? (
        <div className="text-center max-w-sm">
          <BrandLogo size="sm" className="mb-6" />
          <h1 className="text-2xl font-bold mb-2">Join Challenge</h1>
          <p className="text-muted mb-2">{challenge.name}</p>
          {challenge.description && <p className="text-sm mb-6">{challenge.description}</p>}
          <Button onClick={handleJoin} className="w-full">Join on {APP_NAME}</Button>
        </div>
      ) : null}
    </div>
  );
}
