import { Sparkline } from "@/components/charts/sparkline";
import { CHART_COLORS } from "@/components/charts/chart-theme";
import { Delta } from "@/components/ui/delta";
import { InfoTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { KpiModel } from "@/services/dashboard";

const SPARK_COLOR: Partial<Record<KpiModel["id"], string>> = {
  "net-sales": CHART_COLORS.netSales,
  "gross-profit": CHART_COLORS.grossProfit,
  "net-profit": CHART_COLORS.netProfit,
  "net-margin": CHART_COLORS.netProfit,
};

export function KpiCard({ kpi }: { kpi: KpiModel }) {
  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-line bg-white px-4 pb-3 pt-3.5 shadow-card">
      <div className="flex items-center gap-1">
        <h3 className="truncate text-[13px] font-medium text-muted">{kpi.label}</h3>
        <InfoTooltip label={kpi.label} content={kpi.definition} />
      </div>
      <p
        className={cn(
          "mt-1.5 truncate text-[22px] font-semibold leading-tight tracking-tight text-ink",
          kpi.valueTone === "negative" && "text-loss-text",
          kpi.valueTone === "unknown" && "text-muted",
        )}
        title={kpi.exactValue}
      >
        {kpi.value}
      </p>
      <div className="mt-1 flex min-h-[18px] flex-wrap items-center gap-x-1.5 text-xs text-muted">
        {kpi.delta ? <Delta delta={kpi.delta} /> : null}
        <span className="truncate">{kpi.delta?.kind === "unavailable" ? null : kpi.context}</span>
      </div>
      <div className="mt-auto pt-2">
        {kpi.sparkline ? (
          <Sparkline points={kpi.sparkline} color={SPARK_COLOR[kpi.id] ?? CHART_COLORS.netSales} label={kpi.label} />
        ) : (
          <div className="flex h-9 items-end text-2xs text-slate-400">{kpi.delta ? "Select 7+ days for a trend" : null}</div>
        )}
      </div>
    </article>
  );
}

export function KpiGrid({ kpis }: { kpis: KpiModel[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
