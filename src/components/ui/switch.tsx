import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "h-7 w-12 rounded-full transition-colors relative",
        checked ? "bg-accent" : "bg-muted/30"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}
