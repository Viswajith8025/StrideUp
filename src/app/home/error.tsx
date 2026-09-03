"use client";

import { APP_NAME } from "@/lib/brand";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-accent font-semibold mb-1">{APP_NAME}</p>
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted text-sm mb-4">{error.message}</p>
      <button onClick={reset} className="rounded-full bg-accent px-6 py-2 text-accent-foreground font-medium">
        Try again
      </button>
    </div>
  );
}
