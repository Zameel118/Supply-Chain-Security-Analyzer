"use client";

import { useEffect, useMemo, useState } from "react";
import { StampBadge, type StampSeverity } from "@/components/StampBadge";

const STAGES = [
  { id: "parse", label: "Parsing", hint: "lockfiles" },
  { id: "vuln", label: "Vulnerabilities", hint: "OSV batch" },
  { id: "typo", label: "Typosquats", hint: "name distance" },
  { id: "conf", label: "Dep confusion", hint: "public clash" },
  { id: "cicd", label: "CI/CD", hint: "workflows" },
  { id: "sec", label: "Secrets", hint: "masked" },
  { id: "lic", label: "Licenses", hint: "policy" },
] as const;

type FeedRow = {
  t: string;
  msg: string;
  stamp: StampSeverity;
};

const FEED_POOL: Omit<FeedRow, "t">[] = [
  { msg: "bell · parsing lockfile", stamp: "cleared" },
  { msg: "FLAG · pyyaml@5.3.1 high", stamp: "high" },
  { msg: "license · GPL hold", stamp: "medium" },
  { msg: "typo · reqeusts≈requests", stamp: "medium" },
  { msg: "secret · token masked", stamp: "critical" },
  { msg: "ci · action SHA pinned", stamp: "cleared" },
  { msg: "conf · internal pkg clash", stamp: "high" },
  { msg: "osv · lodash clear", stamp: "cleared" },
  { msg: "sweep · 07 checkpoints", stamp: "cleared" },
  { msg: "stamp · report ready", stamp: "cleared" },
];

function stampTone(s: StampSeverity) {
  if (s === "critical" || s === "high") return "text-stamp-red";
  if (s === "medium") return "text-stamp-amber";
  return "text-signal-teal";
}

/**
 * Animated right-rail for the home hero: cycling belt + scrolling signal feed.
 */
export function HeroSignalRail() {
  const [active, setActive] = useState(0);
  const [clock, setClock] = useState("");
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [poolIdx, setPoolIdx] = useState(0);
  const [hits, setHits] = useState(3);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const seed: FeedRow[] = FEED_POOL.slice(0, 4).map((row, i) => ({
      ...row,
      t: new Date(Date.now() - (4 - i) * 9000).toLocaleTimeString(),
    }));
    setFeed(seed);
  }, []);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setActive(STAGES.length - 1);
      return;
    }

    const id = setInterval(() => {
      setActive((n) => (n + 1) % STAGES.length);
      setPoolIdx((n) => {
        const next = (n + 1) % FEED_POOL.length;
        const row = FEED_POOL[next];
        setFeed((prev) =>
          [{ ...row, t: new Date().toLocaleTimeString() }, ...prev].slice(0, 5),
        );
        if (row.stamp === "high" || row.stamp === "critical" || row.stamp === "medium") {
          setHits((h) => h + 1);
        }
        return next;
      });
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const progress = ((active + 1) / STAGES.length) * 100;
  const stageLabel = STAGES[active]?.label ?? "Parsing";

  const sparkles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        top: `${8 + ((i * 11) % 84)}%`,
        left: `${6 + ((i * 17) % 88)}%`,
        delay: `${(i * 0.35) % 2.4}s`,
      })),
    [],
  );

  return (
    <aside className="relative flex h-full min-h-[440px] flex-col overflow-hidden border border-signal-teal/35 bg-ink-950/95 shadow-[0_0_56px_-14px_rgba(45,212,191,0.55)] quay-scanlines">
      <div className="quay-feed-rail opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -right-10 top-6 h-36 w-36 rounded-full bg-signal-teal/20 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-20 h-32 w-32 rounded-full bg-stamp-amber/15 blur-2xl" />
      {sparkles.map((s) => (
        <span
          key={s.id}
          aria-hidden
          className="pointer-events-none absolute h-0.5 w-0.5 rounded-full bg-signal-teal/70 quay-pulse"
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        />
      ))}

      <div className="relative z-[1] flex items-center justify-between border-b border-manifest-200/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-signal-teal/50" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-signal-teal" />
          </span>
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-signal-teal">
              Live action
            </p>
            <p className="font-mono text-[9px] text-stamp-slate">belt · signal feed</p>
          </div>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-stamp-slate">{clock}</span>
      </div>

      <div className="relative z-[1] border-b border-manifest-200/10 px-3 py-3">
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-stamp-slate">
              Active sweep
            </p>
            <p className="font-display text-sm font-bold uppercase tracking-wide text-manifest-100">
              {stageLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums leading-none text-signal-teal">
              {String(active + 1).padStart(2, "0")}
              <span className="text-sm text-stamp-slate">/07</span>
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-stamp-amber quay-board-live">RUN</p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden bg-ink-800">
          <div
            className="h-full bg-gradient-to-r from-signal-teal via-signal-teal to-stamp-amber transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[9px] text-stamp-slate">
          <span>{Math.round(progress)}% belt</span>
          <span>
            <span className="text-stamp-amber">{hits}</span> flags today
          </span>
        </div>
      </div>

      <ol className="relative z-[1] flex gap-1 px-2.5 py-2.5">
        {STAGES.map((stage, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={stage.id} className="min-w-0 flex-1" title={stage.label}>
              <div
                className={`h-1.5 transition-all duration-300 ${
                  current
                    ? "bg-stamp-amber shadow-[0_0_10px_rgba(251,191,36,0.7)]"
                    : done
                      ? "bg-signal-teal"
                      : "bg-manifest-200/15"
                }`}
              />
              <p
                className={`mt-1 truncate text-center font-mono text-[8px] uppercase ${
                  current ? "text-stamp-amber" : done ? "text-signal-teal" : "text-stamp-slate"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="relative z-[1] flex flex-1 flex-col border-t border-manifest-200/10">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-stamp-slate">
            Ingress stream
          </p>
          <span className="font-mono text-[9px] text-signal-teal quay-board-live">TX</span>
        </div>
        <ul className="flex flex-1 flex-col gap-1.5 overflow-hidden px-2.5 pb-3">
          {feed.map((row, i) => (
            <li
              key={`${row.t}-${row.msg}-${i}`}
              className={`quay-feed-ingress flex items-center gap-2 border px-2 py-1.5 ${
                i === 0
                  ? "border-signal-teal/40 bg-signal-teal/10"
                  : "border-manifest-200/10 bg-ink-800/45"
              }`}
            >
              <StampBadge severity={row.stamp} seed={`${row.msg}-${i}`} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[10px] text-manifest-100">{row.msg}</p>
                <p className={`font-mono text-[9px] tabular-nums ${stampTone(row.stamp)}`}>
                  {row.t}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
