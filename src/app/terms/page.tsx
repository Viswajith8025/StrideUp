import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { APP_NAME, APP_TAGLINE, BRAND } from "@/lib/brand";

export default function TermsPage() {
  return (
    <AppShell showNav={false}>
      <header className="flex items-center gap-3 py-4">
        <Link href="/settings"><ArrowLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Terms of Service</h1>
      </header>
      <div className="prose prose-invert text-sm space-y-4 text-muted-foreground pb-8">
        <p className="text-accent font-medium">{APP_NAME}</p>
        <p className="text-foreground text-xs">{APP_TAGLINE}</p>
        <p><strong className="text-foreground">Last updated:</strong> September 2026</p>
        <p>By using {APP_NAME}, you agree to these terms.</p>
        <h2 className="text-foreground text-base font-semibold">Service</h2>
        <p>{APP_NAME} provides step tracking and fitness challenge features. Calorie and distance estimates are approximations, not medical measurements.</p>
        <h2 className="text-foreground text-base font-semibold">Acceptable Use</h2>
        <p>You agree not to misuse the service, attempt unauthorized access, or harass other users in challenge chats.</p>
        <h2 className="text-foreground text-base font-semibold">Health Disclaimer</h2>
        <p>{APP_NAME} is not a medical device. Consult a healthcare professional before starting any fitness program.</p>
        <h2 className="text-foreground text-base font-semibold">Limitation of Liability</h2>
        <p>We provide the service &quot;as is&quot; without warranties. We are not liable for any damages arising from use of the app.</p>
        <h2 className="text-foreground text-base font-semibold">Contact</h2>
        <p>Questions? Email <a href={`mailto:${BRAND.legalEmail}`} className="text-accent">{BRAND.legalEmail}</a></p>
      </div>
    </AppShell>
  );
}
