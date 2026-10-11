import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warning"; title?: string; children: ReactNode; className?: string }) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] leading-relaxed",
        tone === "info" && "border-line bg-white text-slate-600",
        tone === "warning" && "border-amber-200 bg-warning-soft text-amber-900",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "info" ? "text-slate-400" : "text-warning-text")} aria-hidden="true" />
      <div>
        {title ? <span className="font-medium text-ink">{title} </span> : null}
        {children}
      </div>
    </div>
  );
}
