"use client";

import { useEffect, useState } from "react";
import { StampBadge } from "@/components/StampBadge";

type FeedRow = {
  id: string;
  time: string;
  repo: string;
  phase: string;
  stamp: "cleared" | "high" | "medium" | "critical" | "low";
};

const SEED: Omit<FeedRow, "id" | "time">[] = [
  { repo: "acme/payments-api", phase: "OSV batch complete", stamp: "cleared" },
  { repo: "nova/edge-gateway", phase: "typosquat FLAG", stamp: "high" },
  { repo: "harbor/ci-runner", phase: "unpinned action", stamp: "medium" },
  { repo: "orbit/web", phase: "secret masked", stamp: "critical" },
  { repo: "delta/sdk", phase: "license review", stamp: "medium" },
  { repo: "pulse/mobile", phase: "berth CLEARED", stamp: "cleared" },
  { repo: "kite/ml-pipeline", phase: "dep confusion check", stamp: "low" },
  { repo: "north/auth", phase: "parsing lockfile", stamp: "cleared" },
];

/**
 * Full-width streaming feed for the landing page empty zone.
 */
export function HomeLiveStream() {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const push = () => {
      const seed = SEED[Math.floor(Math.random() * SEED.length)];
      const row: FeedRow = {
        ...seed,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: new Date().toLocaleTimeString(),
      };
      setRows((prev) => [row, ...prev].slice(0, 8));
      setTick((n) => n + 1);
    };

    push();
    if (reduced) return;
    const id = setInterval(push, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-signal-teal">
            Global berth traffic
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-manifest-100">
            Live action stream
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-stamp-slate">
          <span className="h-2 w-2 rounded-full bg-signal-cyan quay-pulse" />
          <span className="quay-live-pill">Live</span>
          STREAMING · {tick} pulses
        </div>
      </div>

      <div className="relative overflow-hidden quay-live-panel quay-scanlines">
        <ul className="grid divide-y divide-manifest-200/10 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className={`quay-feed-ingress flex flex-wrap items-center gap-3 px-4 py-3 ${
                i === 0 ? "bg-signal-teal/8" : ""
              } ${i % 2 === 1 ? "lg:border-l lg:border-manifest-200/10" : ""}`}
            >
              <span className="w-20 shrink-0 font-mono text-[11px] tabular-nums text-stamp-slate">
                {row.time}
              </span>
              <StampBadge severity={row.stamp} seed={row.id} size="sm" />
              <span className="min-w-0 flex-1 font-mono text-xs text-manifest-100 sm:text-sm">
                <span className="text-signal-teal">{row.repo}</span>
                <span className="text-stamp-slate"> · </span>
                {row.phase}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-stamp-slate">
                demo signal
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
