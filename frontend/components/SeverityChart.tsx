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
import { SEVERITY_ORDER } from "@/lib/risk";

const STAMP_FILL: Record<string, string> = {
  critical: "#F87171",
  high: "#FB923C",
  medium: "#FBBF24",
  low: "#64748B",
  info: "#64748B",
};

type Props = {
  counts: Record<string, number>;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-manifest-200/20 bg-ink-950 px-3 py-2 font-mono text-xs text-manifest-100">
      <p className="uppercase tracking-wide text-stamp-slate">{label}</p>
      <p className="mt-0.5 text-signal-teal">{payload[0].value} findings</p>
    </div>
  );
}

export function SeverityChart({ counts }: Props) {
  const data = SEVERITY_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((s) => ({
    severity: s,
    count: counts[s] ?? 0,
  }));

  if (data.length === 0) {
    return (
      <p className="flex h-48 items-center justify-center font-mono text-sm text-stamp-slate">
        No findings to chart.
      </p>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,46,72,0.9)" />
          <XAxis
            dataKey="severity"
            tick={{ fill: "rgba(232,226,208,0.6)", fontSize: 11, fontFamily: "var(--font-plex-mono)" }}
            axisLine={{ stroke: "rgba(232,226,208,0.15)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "rgba(232,226,208,0.6)", fontSize: 11, fontFamily: "var(--font-plex-mono)" }}
            axisLine={{ stroke: "rgba(232,226,208,0.15)" }}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(45,212,191,0.06)" }} />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.severity} fill={STAMP_FILL[entry.severity] ?? "#7C8CA6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
