"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  loading,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted mb-6">{description}</p>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          className="flex-1"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
