"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SEVERITY_COLORS, SEVERITY_ORDER } from "@/lib/risk";

type Props = {
  counts: Record<string, number>;
};

export function SeverityChart({ counts }: Props) {
  const data = SEVERITY_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((s) => ({
    severity: s,
    count: counts[s] ?? 0,
  }));

  if (data.length === 0) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-slate-400">
        No findings to chart.
      </p>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="severity"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
          />
          <Tooltip
            contentStyle={{
              background: "#0f1c2e",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6,
              color: "#e8eef7",
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.severity}
                fill={SEVERITY_COLORS[entry.severity] ?? SEVERITY_COLORS.info}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
