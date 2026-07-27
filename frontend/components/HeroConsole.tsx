"use client";

import { useEffect, useState } from "react";
import { StampBadge } from "@/components/StampBadge";

const LINES = [
  { t: "12:04:01", msg: "belt · parsing lockfile", ok: true },
  { t: "12:04:08", msg: "osv · 142 packages queried", ok: true },
  { t: "12:04:11", msg: "FLAG · pyyaml@5.3.1 high", ok: false },
  { t: "12:04:14", msg: "typosquat · clear", ok: true },
  { t: "12:04:19", msg: "secrets · 0 matches", ok: true },
  { t: "12:04:22", msg: "license · review GPL hold", ok: false },
  { t: "12:04:25", msg: "berth CLEARED · report ready", ok: true },
  { t: "12:04:28", msg: "share token minted", ok: true },
  { t: "12:04:31", msg: "badge.svg refreshed", ok: true },
];

export function HeroConsole() {
  const [visible, setVisible] = useState(3);
  const [clock, setClock] = useState("--:--:--");
  const [latency, setLatency] = useState(1.2);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(LINES.length);
      return;
    }
    const id = setInterval(() => {
      setVisible((n) => (n >= LINES.length ? 2 : n + 1));
      setLatency((n) => Math.round((0.8 + Math.random() * 1.4) * 10) / 10);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const shown = LINES.slice(0, visible);

  return (
    <div className="relative flex h-full min-h-[420px] flex-col overflow-hidden quay-live-panel quay-scanlines">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-signal-teal/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-signal-cyan/12 blur-3xl" />

      <div className="relative z-[1] quay-live-header flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-signal-cyan quay-pulse" />
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-manifest-100">
            Live berth · demo
          </span>
          <span className="quay-live-pill">Live</span>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-stamp-slate">{clock}</span>
      </div>

      <div className="relative z-[1] grid flex-1 grid-cols-[1fr_auto] gap-0">
        <div className="relative flex min-h-[200px] items-center justify-center border-r border-signal-teal/15 p-6">
          <div className="quay-radar absolute inset-6 opacity-90" aria-hidden />
          <div className="relative z-10 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-stamp-slate">
              Threat sweep
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-signal-cyan quay-count-glow">
              07
            </p>
            <p className="mt-1 font-mono text-[10px] text-manifest-200/60">checkpoints armed</p>
          </div>
        </div>

        <div className="w-[9.5rem] space-y-2 bg-black/25 p-3 sm:w-44">
          <StampBadge severity="cleared" seed="hero-ok" size="sm" />
          <StampBadge severity="high" seed="hero-hi" size="sm" />
          <StampBadge severity="medium" seed="hero-md" size="sm" />
          <div className="border border-signal-teal/20 bg-ink-900/90 px-2 py-2">
            <p className="font-mono text-[9px] uppercase text-stamp-slate">Latency</p>
            <p className="font-mono text-sm tabular-nums text-signal-cyan">{latency.toFixed(1)}s</p>
          </div>
        </div>
      </div>

      <ul className="relative z-[1] min-h-[9rem] space-y-0.5 overflow-hidden border-t border-signal-teal/15 bg-black/30 px-3 py-2.5 font-mono text-[11px]">
        {shown.map((line, i) => (
          <li
            key={`${line.t}-${i}-${visible}`}
            className={`flex gap-2 quay-feed-ingress ${
              line.ok ? "text-signal-lime/85" : "text-stamp-amber"
            }`}
          >
            <span className="shrink-0 text-stamp-slate">{line.t}</span>
            <span className="truncate">{line.msg}</span>
          </li>
        ))}
        <li className="text-signal-cyan/90">
          root@quaywatch:<span className="quay-cursor-blink">█</span>
        </li>
      </ul>
    </div>
  );
}
