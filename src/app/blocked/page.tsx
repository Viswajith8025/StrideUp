import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BlockedPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold mb-2">Account deactivated</h1>
      <p className="text-muted mb-6">
        Your account has been deactivated. Contact support if you believe this is a mistake.
      </p>
      <Link href="/support">
        <Button variant="outline">Contact support</Button>
      </Link>
    </div>
  );
}
