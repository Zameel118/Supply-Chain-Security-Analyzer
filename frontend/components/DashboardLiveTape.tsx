"use client";

import type { Scan } from "@/lib/api";

type Props = { scans: Scan[] };

export function DashboardLiveTape({ scans }: Props) {
  const running = scans.filter((s) => s.status === "running" || s.status === "queued").length;
  const holds = scans.filter((s) => s.status === "failed").length;
  const cleared = scans.filter((s) => s.status === "complete").length;
  const findings = scans.reduce((n, s) => n + (s.finding_count ?? 0), 0);

  const items = [
    { label: "On belt", value: running, tone: "text-signal-cyan" },
    { label: "Cleared", value: cleared, tone: "text-signal-teal" },
    { label: "Holds", value: holds, tone: "text-stamp-red" },
    { label: "Findings", value: findings, tone: "text-manifest-100" },
  ];

  return (
    <div className="mb-5 overflow-hidden quay-live-panel">
      <div className="quay-live-header flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="quay-live-pill">Live ops</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-manifest-100">
            Real-time berth telemetry
          </span>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-stamp-slate">
          {new Date().toLocaleTimeString()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-manifest-200/10 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="bg-ink-950/90 px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-stamp-slate">{item.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${item.tone}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
