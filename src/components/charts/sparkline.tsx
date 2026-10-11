"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { SparkPoint } from "@/services/dashboard";

export function Sparkline({ points, color, label }: { points: SparkPoint[]; color: string; label: string }) {
  return (
    <div className="h-9 w-full" role="img" aria-label={`${label} daily trend`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            cursor={{ stroke: "#CBD5E1", strokeWidth: 1 }}
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 20 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as SparkPoint | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-md bg-ink px-2 py-1 text-2xs text-white shadow-popover">
                  <span className="text-white/70">{point.label}</span> <span className="num font-medium">{point.text}</span>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 2, stroke: "#fff" }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
