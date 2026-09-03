import Image from "next/image";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <div className="h-14 w-14 rounded-full bg-accent/20 flex items-center justify-center ring-4 ring-accent/30 animate-pulse">
        <Image src="/icons/icon.svg" alt={APP_NAME} width={32} height={32} />
      </div>
      <p className="font-semibold text-foreground">{APP_NAME}</p>
      <p className="text-muted text-xs">{APP_TAGLINE}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-card-elevated", className)} />;
}
