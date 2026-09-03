"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setMessage("Check your email for a password reset link.");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 safe-top safe-bottom bg-background">
      <div className="mx-auto w-full max-w-sm">
        <BrandLogo size="sm" className="mb-8" />
        <h1 className="text-2xl font-bold mb-2 text-center">Reset password</h1>
        <p className="text-muted mb-8 text-center">Enter your email to receive a reset link</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {message && <p className="text-green-400 text-sm">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-accent hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
