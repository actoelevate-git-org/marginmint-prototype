import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "./tooltip";

export function StatTile({
  label,
  value,
  hint,
  tooltip,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tooltip?: string;
  tone?: "default" | "negative" | "warning";
}) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-white px-4 py-3 shadow-card">
      <div className="flex items-center gap-1 text-[13px] text-muted">
        {label}
        {tooltip ? <InfoTooltip label={label} content={tooltip} /> : null}
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold tracking-tight text-ink",
          tone === "negative" && "text-loss-text",
          tone === "warning" && "text-warning-text",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6", className)}>{children}</div>;
}
