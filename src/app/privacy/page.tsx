import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { APP_NAME, APP_TAGLINE, BRAND } from "@/lib/brand";

export default function PrivacyPage() {
  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Privacy Policy</h1>
      </header>
      <div className="prose prose-invert text-sm space-y-4 text-muted-foreground pb-8">
        <p className="text-accent font-medium">{APP_NAME}</p>
        <p className="text-foreground text-xs">{APP_TAGLINE}</p>
        <p><strong className="text-foreground">Last updated:</strong> September 2026</p>
        <p>{APP_NAME} (&quot;we&quot;, &quot;our&quot;) respects your privacy. This policy explains how we handle your data.</p>
        <h2 className="text-foreground text-base font-semibold">Data We Collect</h2>
        <p>We collect account information (email, display name), fitness activity data (steps, distance, calories), and app preferences you configure.</p>
        <h2 className="text-foreground text-base font-semibold">How We Use Data</h2>
        <p>Your data is used to provide step tracking, challenges, leaderboards, and chat features. We do not sell your personal data.</p>
        <h2 className="text-foreground text-base font-semibold">Data Storage</h2>
        <p>Data is stored securely in our database with row-level security. Only you can access your personal activity data.</p>
        <h2 className="text-foreground text-base font-semibold">Your Rights</h2>
        <p>You can export your data at any time from Settings. You may request account deletion by contacting us.</p>
        <h2 className="text-foreground text-base font-semibold">Contact</h2>
        <p>Questions? Email <a href={`mailto:${BRAND.privacyEmail}`} className="text-accent">{BRAND.privacyEmail}</a></p>
      </div>
    </AppShell>
  );
}
