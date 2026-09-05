"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={cn("w-full rounded-t-2xl bg-card p-6 safe-bottom max-h-[80vh] overflow-y-auto", className)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "sheet-title" : undefined}
        aria-label={title ? undefined : "Dialog"}
      >
        {title && (
          <h3 id="sheet-title" className="text-lg font-semibold mb-4">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
