"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Scan } from "@/lib/api";

type Props = {
  scans: Scan[];
  repoUrl: string;
};

export function TrendSparkline({ scans, repoUrl }: Props) {
  const series = scans
    .filter((s) => s.repo_url === repoUrl && s.status === "complete")
    .slice()
    .reverse()
    .slice(-12)
    .map((s, i) => ({
      i: i + 1,
      findings: s.finding_count ?? 0,
      label: new Date(s.created_at).toLocaleDateString(),
    }));

  if (series.length < 2) {
    return (
      <p className="font-mono text-[11px] text-stamp-slate">
        Trend unlocks after 2+ completed scans of this repo.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-wide text-manifest-200/70">
        Finding trend · last {series.length} scans
      </p>
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              contentStyle={{
                background: "#0B1420",
                border: "1px solid rgba(232,226,208,0.2)",
                fontFamily: "var(--font-plex-mono)",
                fontSize: 11,
                color: "#E8E2D0",
              }}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.label ? String(payload[0].payload.label) : ""
              }
            />
            <Line
              type="monotone"
              dataKey="findings"
              stroke="#2DD4BF"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 font-mono text-[10px] text-stamp-slate">
        {series[0].findings} → {series[series.length - 1].findings} findings
      </p>
    </div>
  );
}
