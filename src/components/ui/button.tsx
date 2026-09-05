import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "pressable inline-flex items-center justify-center rounded-full font-medium transition-[color,background-color,opacity,transform] duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none",
          variant === "default" && "bg-accent text-accent-foreground hover:opacity-90",
          variant === "ghost" && "hover:bg-card text-foreground",
          variant === "outline" && "border border-border hover:bg-card",
          variant === "destructive" && "bg-destructive text-white",
          size === "sm" && "h-9 px-4 text-sm",
          size === "md" && "h-11 px-6 text-base",
          size === "lg" && "h-14 px-8 text-lg",
          size === "icon" && "h-11 w-11",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
