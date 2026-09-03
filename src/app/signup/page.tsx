"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand/brand-logo";
import { APP_TAGLINE } from "@/lib/brand";

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = signupSchema.safeParse({ displayName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/settings/step-counter");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 safe-top safe-bottom bg-background">
      <div className="mx-auto w-full max-w-sm">
        <BrandLogo showTagline className="mb-8" />
        <h2 className="text-xl font-semibold mb-2 text-center">Create your account</h2>
        <p className="text-muted mb-8 text-center text-sm">{APP_TAGLINE}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
