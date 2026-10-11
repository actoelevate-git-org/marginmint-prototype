import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { DeltaModel } from "@/services/dashboard";
import { cn } from "@/lib/utils";

/** Change indicator: arrow icon + signed text, so direction never relies on colour alone. */
export function Delta({ delta, className }: { delta: DeltaModel; className?: string }) {
  if (delta.kind === "unavailable") {
    return <span className={cn("text-xs text-muted", className)}>{delta.text}</span>;
  }
  const Icon = delta.direction === "up" ? ArrowUpRight : delta.direction === "down" ? ArrowDownRight : Minus;
  const label = delta.direction === "up" ? "Up" : delta.direction === "down" ? "Down" : "Unchanged";
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 text-xs font-medium",
        delta.tone === "positive" && "text-gain-text",
        delta.tone === "negative" && "text-loss-text",
        delta.tone === "neutral" && "text-muted",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{label} </span>
      {delta.text}
    </span>
  );
}
