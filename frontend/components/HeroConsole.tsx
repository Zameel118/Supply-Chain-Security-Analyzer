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

const TAIL_LINES = 5;

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
      setLatency(Math.round((0.8 + Math.random() * 1.4) * 10) / 10);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const tail = LINES.slice(0, visible).slice(-TAIL_LINES);

  return (
    <div className="relative flex w-full flex-col overflow-hidden quay-live-panel quay-scanlines">
      <div className="relative z-[1] shrink-0 quay-live-header flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-signal-cyan quay-pulse" />
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-manifest-100">
            Live berth · demo
          </span>
          <span className="quay-live-pill">Live</span>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-stamp-slate">{clock}</span>
      </div>

      <div className="relative z-[1] flex flex-wrap items-center gap-2 border-b border-signal-teal/15 bg-black/30 px-3 py-2">
        <StampBadge severity="cleared" seed="hero-ok" size="sm" />
        <StampBadge severity="high" seed="hero-hi" size="sm" />
        <StampBadge severity="medium" seed="hero-md" size="sm" />
        <div className="ml-auto flex items-baseline gap-1.5 border border-signal-teal/20 bg-ink-900/90 px-2.5 py-1 font-mono">
          <span className="text-[9px] uppercase text-stamp-slate">Latency</span>
          <span className="text-sm tabular-nums text-signal-cyan">{latency.toFixed(1)}s</span>
        </div>
      </div>

      <div className="relative z-[1] flex justify-center border-b border-signal-teal/10 py-4 xl:py-5">
        <div className="quay-radar-hub relative h-[12.5rem] w-[12.5rem] sm:h-[13.5rem] sm:w-[13.5rem] xl:h-[15rem] xl:w-[15rem]">
          <div className="quay-radar absolute inset-0 opacity-95" aria-hidden />
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-stamp-slate">
              Threat sweep
            </p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-signal-cyan quay-count-glow xl:text-5xl">
              07
            </p>
            <p className="mt-1 font-mono text-[10px] text-manifest-200/60">checkpoints armed</p>
          </div>
        </div>
      </div>

      <div className="relative z-[1] shrink-0 bg-black/40">
        <div className="flex items-center justify-between border-b border-signal-teal/10 px-3 py-1">
          <p className="font-mono text-[9px] uppercase tracking-wider text-stamp-slate">
            shell · berth.log
          </p>
          <span className="font-mono text-[9px] text-signal-lime/80">tail -n {TAIL_LINES}</span>
        </div>

        <ul className="quay-terminal-log space-y-0 px-3 py-1.5 font-mono text-[11px] leading-snug">
          {tail.map((line, i) => (
            <li
              key={`${line.t}-${i}-${visible}`}
              className={`flex gap-2 quay-feed-ingress ${
                line.ok ? "text-signal-lime/85" : "text-stamp-amber"
              }`}
            >
              <span className="w-[4.5rem] shrink-0 tabular-nums text-stamp-slate">{line.t}</span>
              <span className="min-w-0 truncate">{line.msg}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-signal-teal/10 px-3 py-1.5 font-mono text-[11px] text-signal-cyan/90">
          root@quaywatch:<span className="quay-cursor-blink">█</span>
        </div>
      </div>
    </div>
  );
}
