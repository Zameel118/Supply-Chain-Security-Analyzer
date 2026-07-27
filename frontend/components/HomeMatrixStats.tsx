"use client";

import { useEffect, useState } from "react";

type Metric = { label: string; value: number; tone: string };

type Props = {
  /** 2×2 grid for narrow hero column; avoids crushed 4-column layout */
  compact?: boolean;
};

function format(n: number) {
  if (n >= 100_000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

const BASE: Metric[] = [
  { label: "Packages indexed", value: 142_340, tone: "text-signal-cyan" },
  { label: "OSV queries / min", value: 890, tone: "text-signal-teal" },
  { label: "Secrets masked", value: 12, tone: "text-stamp-amber" },
  { label: "Berths cleared", value: 48, tone: "text-signal-lime" },
];

export function HomeMatrixStats({ compact = false }: Props) {
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

  const gridClass = compact ? "grid-cols-2 grid-rows-2" : "grid-cols-2 sm:grid-cols-4";

  const rootClass = compact
    ? `quay-hero-panel quay-matrix-hero grid ${gridClass} gap-px border border-signal-teal/25 bg-signal-teal/20`
    : `grid ${gridClass} gap-px border border-signal-teal/25 bg-signal-teal/20`;

  return (
    <div className={rootClass}>
      {metrics.map((m) => (
        <div
          key={m.label}
          className={`min-w-0 bg-black/50 quay-scanlines ${
            compact
              ? "flex min-h-0 flex-col justify-center px-3 py-4 sm:px-4"
              : "px-2.5 py-2.5 sm:px-3 sm:py-3"
          }`}
        >
          <p
            className={`truncate font-mono uppercase tracking-wide text-stamp-slate ${
              compact ? "text-[9px] sm:text-[10px]" : "text-[8px] sm:text-[9px]"
            }`}
          >
            {m.label}
          </p>
          <p
            className={`mt-1 truncate font-mono font-semibold tabular-nums ${
              compact ? "text-2xl sm:text-3xl xl:text-[2rem]" : "mt-0.5 text-base sm:text-lg"
            } ${m.tone}`}
          >
            {format(m.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
