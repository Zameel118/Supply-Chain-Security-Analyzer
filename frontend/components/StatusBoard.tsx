"use client";

import type { Scan } from "@/lib/api";

type Props = {
  scans: Scan[];
};

export function StatusBoard({ scans }: Props) {
  const queued = scans.filter((s) => s.status === "queued").length;
  const running = scans.filter((s) => s.status === "running").length;
  const complete = scans.filter((s) => s.status === "complete").length;
  const failed = scans.filter((s) => s.status === "failed").length;
  const findings = scans.reduce((n, s) => n + (s.finding_count ?? 0), 0);

  const rows = [
    { code: "QED", label: "QUEUED", count: queued, tone: "text-stamp-slate", bar: "bg-stamp-slate" },
    {
      code: "RUN",
      label: "ON BELT",
      count: running,
      tone: "text-stamp-amber",
      bar: "bg-stamp-amber",
      pulse: running > 0,
    },
    {
      code: "CLR",
      label: "CLEARED",
      count: complete,
      tone: "text-signal-teal",
      bar: "bg-signal-teal",
    },
    { code: "HLD", label: "HOLD", count: failed, tone: "text-stamp-red", bar: "bg-stamp-red" },
  ];

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="overflow-hidden border border-manifest-200/15 bg-ink-950 shadow-[inset_0_1px_0_rgba(45,212,191,0.12)] quay-scanlines">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-manifest-200/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-teal quay-pulse" />
          <p className="font-display text-xs font-bold uppercase tracking-wide text-manifest-200/90">
            Berth status board
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] text-stamp-slate">
          <span>
            FINDINGS · <span className="text-manifest-100 tabular-nums">{findings}</span>
          </span>
          <span className="quay-board-live text-signal-teal">TX LIVE</span>
          <span>{new Date().toLocaleString()} · LOCAL</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-manifest-200/10 sm:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.code}
            className={`relative bg-ink-950 px-4 py-3.5 ${row.pulse ? "quay-nav-live" : ""}`}
          >
            <p className="font-mono text-[10px] tracking-widest text-stamp-slate">
              {row.code} · {row.label}
            </p>
            <p className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${row.tone}`}>
              {String(row.count).padStart(2, "0")}
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden bg-ink-800">
              <div
                className={`h-full ${row.bar} transition-all duration-500`}
                style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
