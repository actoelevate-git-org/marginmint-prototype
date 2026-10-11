"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, compactInrTick } from "@/components/charts/chart-theme";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Table, TableContainer, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import type { TrendPoint } from "@/services/dashboard";

const SERIES = [
  { key: "netSales", text: "netSalesText", label: "Net sales", color: CHART_COLORS.netSales },
  { key: "grossProfit", text: "grossProfitText", label: "Gross profit", color: CHART_COLORS.grossProfit },
  { key: "netProfit", text: "netProfitText", label: "Net profit", color: CHART_COLORS.netProfit },
] as const;

type Grouping = "daily" | "weekly";
type View = "chart" | "table";

export function RevenueProfitChart({ daily, weekly }: { daily: TrendPoint[]; weekly: TrendPoint[] }) {
  const [grouping, setGrouping] = useState<Grouping>(daily.length > 45 ? "weekly" : "daily");
  const [view, setView] = useState<View>("chart");
  const data = grouping === "daily" ? daily : weekly;
  const hasNegative = data.some((p) => (p.netProfit ?? 0) < 0 || (p.grossProfit ?? 0) < 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <SegmentedControl
            label="Group by"
            value={grouping}
            onChange={setGrouping}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
            ]}
          />
          <SegmentedControl
            label="Display as"
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: "Chart" },
              { value: "table", label: "Table" },
            ]}
          />
        </div>
      </div>

      {data.length < 2 && view === "chart" ? (
        <div className="flex h-[300px] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium text-ink">Not enough points for a trend</p>
          <p className="mt-1 max-w-xs text-[13px] text-muted">
            This range has a single {grouping === "daily" ? "day" : "week"}. Choose 7 days or more, or switch to the table view.
          </p>
        </div>
      ) : view === "chart" ? (
        <div className="h-[300px] px-2 pb-3" role="img" aria-label="Net sales, gross profit and net profit over time in rupees. Switch to table view for exact values.">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="salesWash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.netSales} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={CHART_COLORS.netSales} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.baseline }}
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                minTickGap={24}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={compactInrTick}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                width={56}
              />
              {hasNegative ? <ReferenceLine y={0} stroke={CHART_COLORS.baseline} /> : null}
              <Tooltip
                cursor={{ stroke: "#94A3B8", strokeWidth: 1 }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as TrendPoint | undefined;
                  if (!active || !point) return null;
                  return (
                    <div className="min-w-[200px] rounded-md border border-line bg-white px-3 py-2 shadow-popover">
                      <p className="text-xs font-medium text-ink">{point.detail}</p>
                      <dl className="mt-1.5 space-y-1">
                        {SERIES.map((s) => (
                          <div key={s.key} className="flex items-center justify-between gap-4 text-xs">
                            <dt className="flex items-center gap-1.5 text-slate-600">
                              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                              {s.label}
                            </dt>
                            <dd className="num font-medium text-ink">{point[s.text]}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="netSales"
                stroke={CHART_COLORS.netSales}
                strokeWidth={2}
                fill="url(#salesWash)"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="grossProfit"
                stroke={CHART_COLORS.grossProfit}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                stroke={CHART_COLORS.netProfit}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <TableContainer className="max-h-[300px] overflow-y-auto">
          <Table>
            <THead className="sticky top-0">
              <tr>
                <Th>{grouping === "daily" ? "Day" : "Week"}</Th>
                {SERIES.map((s) => (
                  <Th key={s.key} align="right">
                    {s.label}
                  </Th>
                ))}
              </tr>
            </THead>
            <TBody>
              {[...data].reverse().map((p) => (
                <Tr key={p.key}>
                  <Td>{p.detail}</Td>
                  <Td align="right">{p.netSalesText}</Td>
                  <Td align="right">{p.grossProfitText}</Td>
                  <Td align="right" className={(p.netProfit ?? 0) < 0 ? "text-loss-text" : undefined}>
                    {p.netProfitText}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
