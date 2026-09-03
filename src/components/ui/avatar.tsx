import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/formatting";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover", sizes[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center",
        sizes[size],
        className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
