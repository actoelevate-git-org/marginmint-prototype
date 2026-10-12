"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS, compactInrTick } from "@/components/charts/chart-theme";
import type { ReportChart as ReportChartModel } from "@/services/report-views";

const COLOR = {
  sales: CHART_COLORS.netSales,
  gross: CHART_COLORS.grossProfit,
  net: CHART_COLORS.netProfit,
  neutral: CHART_COLORS.deduction,
  loss: CHART_COLORS.loss,
} as const;

function formatValue(value: number | null | undefined, unit: ReportChartModel["unit"], exact = false): string {
  if (value === null || value === undefined) return "—";
  if (unit === "inr") {
    if (!exact) return compactInrTick(value);
    const sign = value < 0 ? "−" : "";
    return `${sign}₹${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }
  return value.toLocaleString("en-IN", { maximumFractionDigits: 1 }) + (unit === "days" ? " d" : "");
}

/**
 * Report bar chart. Values are display-only numbers produced by the report service;
 * no money math happens here. Horizontal charts grow with the number of categories.
 */
export function ReportChart({ chart }: { chart: ReportChartModel }) {
  const horizontal = chart.orientation === "horizontal";
  const height = horizontal ? Math.max(220, chart.data.length * (chart.series.length > 1 ? 34 : 26) + 60) : 300;
  const hasNegative = chart.data.some((d) => chart.series.some((s) => typeof d[s.key] === "number" && (d[s.key] as number) < 0));

  return (
    <div style={{ height }} role="img" aria-label={`${chart.title}. Exact values are in the table below.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 24, bottom: 4, left: 4 }} barCategoryGap={horizontal ? 6 : "20%"}>
          <CartesianGrid horizontal={!horizontal} vertical={horizontal} stroke={CHART_COLORS.grid} />
          {horizontal ? (
            <>
              <XAxis type="number" tickFormatter={(v: number) => formatValue(v, chart.unit)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} />
              <YAxis type="category" dataKey="label" width={190} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11, fill: "#374151" }} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART_COLORS.baseline }} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} minTickGap={12} />
              <YAxis tickFormatter={(v: number) => formatValue(v, chart.unit)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} width={56} allowDecimals={chart.unit !== "count"} />
            </>
          )}
          {hasNegative ? horizontal ? <ReferenceLine x={0} stroke={CHART_COLORS.baseline} /> : <ReferenceLine y={0} stroke={CHART_COLORS.baseline} /> : null}
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-md border border-line bg-white px-3 py-2 shadow-popover">
                  <p className="max-w-[260px] text-xs font-medium text-ink">{label}</p>
                  {payload.map((p) => (
                    <p key={String(p.dataKey)} className="num mt-0.5 flex items-center justify-between gap-4 text-xs">
                      <span className="text-slate-600">{p.name}</span>
                      <span className="font-semibold text-ink">{formatValue(p.value as number, chart.unit, true)}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {chart.series.length > 1 ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} /> : null}
          {chart.series.map((series) => (
            <Bar key={series.key} dataKey={series.key} name={series.label} fill={COLOR[series.color]} maxBarSize={22} radius={3} isAnimationActive={false}>
              {chart.signColored
                ? chart.data.map((d, i) => <Cell key={i} fill={typeof d[series.key] === "number" && (d[series.key] as number) < 0 ? CHART_COLORS.loss : COLOR[series.color]} />)
                : null}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
