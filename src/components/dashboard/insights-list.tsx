import { AlertOctagon, AlertTriangle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { InsightModel } from "@/services/dashboard";

const SEVERITY = {
  critical: { label: "Critical", icon: AlertOctagon, rail: "bg-loss", text: "text-loss-text", soft: "bg-loss-soft" },
  warning: { label: "Warning", icon: AlertTriangle, rail: "bg-warning", text: "text-warning-text", soft: "bg-warning-soft" },
  info: { label: "Info", icon: Info, rail: "bg-sky-500", text: "text-sky-800", soft: "bg-sky-50" },
} as const;

export function InsightsList({ insights }: { insights: InsightModel[] }) {
  if (insights.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing needs your attention"
        description="No rule fired for this period and marketplace: stock cover, profitability, return rates, settlements and ad efficiency are all within thresholds."
      />
    );
  }
  return (
    <ul className="divide-y divide-line">
      {insights.map((insight) => {
        const s = SEVERITY[insight.severity];
        const Icon = s.icon;
        return (
          <li key={insight.id} className="relative flex gap-3 py-3.5 pl-4 pr-4">
            <span className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r", s.rail)} aria-hidden="true" />
            <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", s.soft)}>
              <Icon className={cn("size-4", s.text)} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-ink">
                  <span className={cn("mr-1.5 text-2xs font-semibold uppercase tracking-wide", s.text)}>{s.label}</span>
                  {insight.title}
                </p>
                <span className="num shrink-0 text-xs font-medium text-slate-600">{insight.metric}</span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{insight.evidence}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] text-ink">
                  <span className="text-muted">Recommended: </span>
                  {insight.action}
                </p>
                <Link
                  href={insight.href}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-forest hover:underline"
                >
                  {insight.linkLabel}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
