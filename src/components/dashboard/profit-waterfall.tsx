"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, compactInrTick } from "@/components/charts/chart-theme";
import type { WaterfallStep } from "@/services/dashboard";

function colorFor(step: WaterfallStep): string {
  if (step.kind === "total") return CHART_COLORS.netSales;
  if (step.kind === "result")
    return step.negativeResult ? CHART_COLORS.loss : CHART_COLORS.netProfit;
  return CHART_COLORS.deduction;
}

/**
 * Horizontal waterfall: net sales at the top, each cost floats from the running
 * total, net profit lands at the bottom. Bars are [low, high] ranges in rupees.
 */
export function ProfitWaterfall({ steps }: { steps: WaterfallStep[] }) {
  const min = Math.min(0, ...steps.map((s) => s.span[0]));
  return (
    <div>
      <div
        className="h-[300px] pr-2"
        role="img"
        aria-label="Profit waterfall from net sales to net profit. Exact values are listed below."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={steps}
            layout="vertical"
            margin={{ top: 4, right: 76, bottom: 0, left: 0 }}
            barCategoryGap={6}
          >
            <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
            <XAxis
              type="number"
              domain={[min, "auto"]}
              tickFormatter={compactInrTick}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={142}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#374151" }}
            />
            {min < 0 ? (
              <ReferenceLine x={0} stroke={CHART_COLORS.baseline} />
            ) : null}
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const step = payload?.[0]?.payload as WaterfallStep | undefined;
                if (!active || !step) return null;
                return (
                  <div className="rounded-md border border-line bg-white px-3 py-2 shadow-popover">
                    <p className="text-xs font-medium text-ink">{step.label}</p>
                    <p className="num mt-0.5 text-sm font-semibold text-ink">
                      {step.amountText}
                    </p>
                    <p className="text-xs text-muted">{step.shareText}</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="span"
              maxBarSize={22}
              radius={3}
              isAnimationActive={false}
            >
              {steps.map((step) => (
                <Cell key={step.id} fill={colorFor(step)} />
              ))}
              <LabelList
                dataKey="amountText"
                position="right"
                className="num"
                style={{ fontSize: 11, fill: "#374151", fontWeight: 500 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="sr-only">
        <table>
          <caption>Profit breakdown</caption>
          <tbody>
            {steps.map((s) => (
              <tr key={s.id}>
                <th scope="row">{s.label}</th>
                <td>{s.amountText}</td>
                <td>{s.shareText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
