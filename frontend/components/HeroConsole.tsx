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
    <div className="relative flex h-[36rem] w-full flex-col overflow-hidden quay-live-panel quay-scanlines xl:h-[38rem] 2xl:h-[40rem]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-signal-teal/20 blur-3xl" />

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

      {/* Sweep + status — fixed height, never grows */}
      <div className="relative z-[1] grid h-[17.5rem] shrink-0 grid-cols-1 gap-0 border-b border-signal-teal/15 sm:grid-cols-[minmax(0,1.15fr)_minmax(10.5rem,0.85fr)] xl:h-[19rem] 2xl:h-[20rem] 2xl:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.8fr)]">
        <div className="relative flex items-center justify-center border-b border-signal-teal/10 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="relative h-[11.5rem] w-[11.5rem] shrink-0 sm:h-[12.5rem] sm:w-[12.5rem] xl:h-[14rem] xl:w-[14rem] 2xl:h-[15rem] 2xl:w-[15rem]">
            <div className="quay-radar absolute inset-0 opacity-95" aria-hidden />
            <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-stamp-slate">
                Threat sweep
              </p>
              <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-signal-cyan quay-count-glow xl:text-5xl 2xl:text-6xl">
                07
              </p>
              <p className="mt-1 font-mono text-[10px] text-manifest-200/60 xl:text-xs">
                checkpoints armed
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 content-center gap-2 bg-black/20 p-3 sm:p-4">
          <StampBadge severity="cleared" seed="hero-ok" size="sm" />
          <StampBadge severity="high" seed="hero-hi" size="sm" />
          <StampBadge severity="medium" seed="hero-md" size="sm" />
          <div className="col-span-2 border border-signal-teal/20 bg-ink-900/90 px-3 py-2">
            <p className="font-mono text-[9px] uppercase text-stamp-slate">Latency</p>
            <p className="font-mono text-xl tabular-nums text-signal-cyan xl:text-2xl">
              {latency.toFixed(1)}s
            </p>
          </div>
        </div>
      </div>

      {/* Terminal — fixed block; log tail only, no layout shift */}
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col bg-black/35">
        <div className="flex shrink-0 items-center justify-between border-b border-signal-teal/15 px-3 py-1.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-stamp-slate">
            shell · berth.log
          </p>
          <span className="font-mono text-[9px] text-signal-lime/80">tail -n {TAIL_LINES}</span>
        </div>

        <ul className="quay-terminal-log flex min-h-0 flex-1 flex-col justify-end gap-0.5 overflow-hidden px-3 py-2 font-mono text-[11px] leading-relaxed xl:text-[12px]">
          {tail.map((line, i) => (
            <li
              key={`${line.t}-${i}-${visible}`}
              className={`flex shrink-0 gap-2 quay-feed-ingress ${
                line.ok ? "text-signal-lime/85" : "text-stamp-amber"
              }`}
            >
              <span className="w-[4.5rem] shrink-0 tabular-nums text-stamp-slate">{line.t}</span>
              <span className="min-w-0 truncate">{line.msg}</span>
            </li>
          ))}
        </ul>

        <div className="shrink-0 border-t border-signal-teal/15 px-3 py-2 font-mono text-[11px] text-signal-cyan/90 xl:text-[12px]">
          root@quaywatch:<span className="quay-cursor-blink">█</span>
        </div>
      </div>
    </div>
  );
}
