import { Card } from "@/components/ui/card";

export function ChartPlaceholder() {
  return (
    <Card className="p-4">
      <div className="h-40 w-full animate-pulse rounded-xl bg-card-elevated" aria-hidden />
    </Card>
  );
}
