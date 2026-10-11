import { AlertTriangle, CheckCircle2, CircleDashed, Clock, RotateCcw, Truck, XCircle, type LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "./badge";

const STATUS: Record<string, { tone: BadgeTone; icon: LucideIcon }> = {
  // Orders
  PENDING: { tone: "warning", icon: Clock },
  CONFIRMED: { tone: "info", icon: CircleDashed },
  SHIPPED: { tone: "info", icon: Truck },
  DELIVERED: { tone: "positive", icon: CheckCircle2 },
  CANCELLED: { tone: "neutral", icon: XCircle },
  RETURNED: { tone: "negative", icon: RotateCcw },
  // Settlements
  MATCHED: { tone: "positive", icon: CheckCircle2 },
  PARTIALLY_MATCHED: { tone: "warning", icon: CircleDashed },
  UNMATCHED: { tone: "neutral", icon: Clock },
  NEEDS_REVIEW: { tone: "warning", icon: AlertTriangle },
  EXCLUDED: { tone: "neutral", icon: XCircle },
  // Stock
  out: { tone: "negative", icon: XCircle },
  low: { tone: "warning", icon: AlertTriangle },
  healthy: { tone: "positive", icon: CheckCircle2 },
};

/** Status pill with icon + text label (never colour alone). */
export function StatusBadge({ status, label }: { status: string; label: string }) {
  const config = STATUS[status] ?? { tone: "neutral" as const, icon: CircleDashed };
  const Icon = config.icon;
  return (
    <Badge tone={config.tone}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
