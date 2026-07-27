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

const MIN_ROWS = 8;

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
      setRows((prev) => [row, ...prev].slice(0, MIN_ROWS));
      setTick((n) => n + 1);
    };

    push();
    if (reduced) return;
    const id = setInterval(push, 2200);
    return () => clearInterval(id);
  }, []);

  const padded = [...rows];
  while (padded.length < MIN_ROWS) {
    padded.push({
      id: `pad-${padded.length}`,
      time: "—:—:—",
      repo: "awaiting signal",
      phase: "listening on ingress channel…",
      stamp: "low",
    });
  }

  return (
      <section className="w-full px-2 py-8 sm:px-3 lg:px-4 xl:px-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-signal-cyan">
            Global berth traffic
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-manifest-100">
            Live action stream
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-stamp-slate">
          <span className="h-2 w-2 rounded-full bg-signal-cyan quay-pulse" />
          <span className="quay-live-pill">Live</span>
          INGRESS · {tick} pulses
        </div>
      </div>

      <div className="relative overflow-hidden quay-live-panel quay-scanlines">
        <div className="quay-live-header flex items-center justify-between px-4 py-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-stamp-slate">
            tail -f /var/log/quaywatch/berth.log
          </p>
          <span className="font-mono text-[9px] text-signal-lime quay-board-live">streaming</span>
        </div>
        <ul className="grid divide-y divide-signal-teal/10 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {padded.map((row, i) => {
            const isPad = row.id.startsWith("pad-");
            return (
              <li
                key={row.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                  i === 0 && !isPad ? "bg-signal-teal/10" : "bg-black/20"
                } ${i % 2 === 1 ? "lg:border-l lg:border-signal-teal/10" : ""} ${
                  isPad ? "opacity-40" : "quay-feed-ingress"
                }`}
              >
                <span className="w-20 shrink-0 font-mono text-[11px] tabular-nums text-stamp-slate">
                  {row.time}
                </span>
                {!isPad ? (
                  <StampBadge severity={row.stamp} seed={row.id} size="sm" />
                ) : (
                  <span className="font-mono text-[9px] text-stamp-slate">···</span>
                )}
                <span className="min-w-0 flex-1 font-mono text-xs text-manifest-100 sm:text-sm">
                  <span className={isPad ? "text-stamp-slate" : "text-signal-cyan"}>{row.repo}</span>
                  <span className="text-stamp-slate"> · </span>
                  {row.phase}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-stamp-slate">
                  {isPad ? "idle" : "demo"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
