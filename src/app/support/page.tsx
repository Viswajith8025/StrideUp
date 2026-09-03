import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION, BRAND } from "@/lib/brand";

export default function SupportPage() {
  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Support</h1>
      </header>
      <div className="space-y-6 text-sm">
        <div>
          <p className="text-accent font-semibold">{APP_NAME}</p>
          <p className="text-muted text-xs mt-1">{APP_TAGLINE}</p>
        </div>
        <p className="text-muted">{APP_DESCRIPTION}</p>
        <p className="text-muted">Need help with {APP_NAME}? We&apos;re here for you.</p>
        <div className="rounded-2xl bg-card p-5 space-y-3">
          <h2 className="font-semibold">Common Questions</h2>
          <div>
            <p className="font-medium">How do I track steps?</p>
            <p className="text-muted">{APP_NAME} uses your phone&apos;s motion sensors when available. You can also add steps manually or import from CSV.</p>
          </div>
          <div>
            <p className="font-medium">How do I join a challenge?</p>
            <p className="text-muted">Go to Challenges, browse active challenges, or use an invite link shared by a friend.</p>
          </div>
          <div>
            <p className="font-medium">Can I export my data?</p>
            <p className="text-muted">Yes — go to Settings → Export Data to download CSV or JSON.</p>
          </div>
        </div>
        <a href={`mailto:${BRAND.supportEmail}`} className="flex items-center gap-3 rounded-2xl bg-card p-4">
          <Mail className="text-accent" size={22} />
          <span>{BRAND.supportEmail}</span>
        </a>
      </div>
    </AppShell>
  );
}
