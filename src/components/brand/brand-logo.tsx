import Image from "next/image";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const sizes = {
  sm: { ring: "h-14 w-14", icon: 32, title: "text-xl", tagline: "text-xs" },
  md: { ring: "h-20 w-20", icon: 48, title: "text-3xl", tagline: "text-sm" },
  lg: { ring: "h-24 w-24", icon: 56, title: "text-4xl", tagline: "text-base" },
};

export function BrandLogo({ size = "md", showTagline = false, className }: BrandLogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className={cn("rounded-full bg-accent/20 flex items-center justify-center ring-4 ring-accent/30 mb-4", s.ring)}>
        <Image src="/icons/icon.svg" alt={APP_NAME} width={s.icon} height={s.icon} />
      </div>
      {size !== "sm" && (
        <h1 className={cn("font-bold", s.title)}>{APP_NAME}</h1>
      )}
      {showTagline && (
        <p className={cn("text-muted mt-1", s.tagline)}>{APP_TAGLINE}</p>
      )}
    </div>
  );
}
