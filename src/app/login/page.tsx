"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand/brand-logo";
import { APP_TAGLINE } from "@/lib/brand";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    const redirect = searchParams.get("redirect");
    const safeRedirect = redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/home";
    router.push(safeRedirect);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 safe-top safe-bottom bg-background">
      <div className="mx-auto w-full max-w-sm">
        <BrandLogo showTagline className="mb-8" />
        <h2 className="text-xl font-semibold mb-2 text-center">Welcome back</h2>
        <p className="text-muted mb-8 text-center text-sm">{APP_TAGLINE}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <Input id="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm space-y-2">
          <Link href="/forgot-password" className="text-accent hover:underline">Forgot password?</Link>
          <p className="text-muted">
            No account? <Link href="/signup" className="text-accent hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
