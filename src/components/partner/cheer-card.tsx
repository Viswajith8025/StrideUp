"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PARTNER_NAME } from "@/lib/partner/constants";
import { loadCachedCheer, saveCachedCheer } from "@/lib/partner/storage";
import { toLocalDateString } from "@/utils/date";

interface PartnerCheerCardProps {
  userId: string;
  displayName: string;
  steps: number;
  goal: number;
  streakDays?: number;
}

export function PartnerCheerCard({
  userId,
  displayName,
  steps,
  goal,
  streakDays = 0,
}: PartnerCheerCardProps) {
  const today = toLocalDateString();
  const [message, setMessage] = useState<string | null>(() => loadCachedCheer(userId, today));
  const [loading, setLoading] = useState(!message);

  useEffect(() => {
    const cached = loadCachedCheer(userId, today);
    if (cached) {
      setMessage(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch("/api/partner/cheer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        steps,
        goal,
        streak: streakDays,
      }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { message?: string };
        if (!cancelled && data.message) {
          saveCachedCheer(userId, today, data.message);
          setMessage(data.message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = `Hey ${displayName} — lace up when you're ready. I've got your back.`;
          saveCachedCheer(userId, today, fallback);
          setMessage(fallback);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, today, displayName, steps, goal, streakDays]);

  return (
    <Card className="mb-4 border border-accent/20 bg-accent/5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20">
          <Sparkles className="text-accent" size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold">{PARTNER_NAME}</p>
            <Link href="/partner" className="text-xs text-accent shrink-0">
              Chat →
            </Link>
          </div>
          <p className="text-sm text-muted leading-snug">
            {loading ? "Thinking of something encouraging…" : message}
          </p>
        </div>
      </div>
    </Card>
  );
}
