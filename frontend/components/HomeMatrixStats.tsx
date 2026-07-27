"use client";

import { useEffect, useState } from "react";

type Metric = { label: string; value: number; tone: string };

function format(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

const BASE: Metric[] = [
  { label: "Packages indexed", value: 142_340, tone: "text-signal-cyan" },
  { label: "OSV queries / min", value: 890, tone: "text-signal-teal" },
  { label: "Secrets masked", value: 12, tone: "text-stamp-amber" },
  { label: "Berths cleared", value: 48, tone: "text-signal-lime" },
];

export function HomeMatrixStats() {
  const [metrics, setMetrics] = useState(BASE);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const id = setInterval(() => {
      setMetrics((prev) =>
        prev.map((m, i) => {
          const delta = [120, 40, 1, 2][i] ?? 1;
          const jitter = Math.floor(Math.random() * delta);
          return { ...m, value: m.value + jitter };
        }),
      );
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-px border border-signal-teal/25 bg-signal-teal/20 sm:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-black/50 px-3 py-3 quay-scanlines sm:px-4 sm:py-4"
        >
          <p className="font-mono text-[9px] uppercase tracking-wider text-stamp-slate">{m.label}</p>
          <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${m.tone}`}>
            {format(m.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
