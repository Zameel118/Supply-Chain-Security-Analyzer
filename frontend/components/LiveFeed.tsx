"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel } from "@/components/Panel";
import { fetchActivity, type ActivityEvent } from "@/lib/api";

function statusTone(status: string | null): string {
  if (status === "complete") return "border-signal-teal/50 bg-signal-teal/5";
  if (status === "failed") return "border-stamp-red/50 bg-stamp-red/5";
  if (status === "running") return "border-signal-cyan/50 bg-signal-cyan/5";
  return "border-stamp-slate/40 bg-ink-800/40";
}

function statusDot(status: string | null): string {
  if (status === "complete") return "bg-signal-teal";
  if (status === "failed") return "bg-stamp-red";
  if (status === "running") return "bg-signal-cyan quay-pulse";
  return "bg-stamp-slate";
}

function shortRepo(url: string | null): string {
  if (!url) return "";
  return url.replace(/^https:\/\/github\.com\//i, "");
}

export function LiveFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let prevLen = 0;

    async function tick() {
      try {
        const data = await fetchActivity();
        if (!cancelled) {
          if (data.length !== prevLen) setFlash((n) => n + 1);
          prevLen = data.length;
          setEvents(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Feed unavailable");
        }
      }
      if (!cancelled) timer = setTimeout(tick, 3000);
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <Panel
      id="feed"
      label="Live action feed"
      data-tour="feed"
      className="relative flex h-full min-h-[28rem] flex-col overflow-hidden !bg-ink-950/90 quay-live-panel quay-scanlines"
    >
      <div className="relative z-[1] mb-4 flex items-center justify-between gap-2 border-b border-manifest-200/10 pb-3 quay-live-header -mx-4 -mt-4 px-4 pt-3 sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-signal-cyan quay-pulse" />
          <span className="quay-live-pill">Live</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-manifest-100">
            Streaming · 3s · pulse #{flash}
          </span>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-stamp-slate">
          {events.length} events
        </span>
      </div>

      {error ? <p className="relative z-[1] text-sm text-stamp-red">{error}</p> : null}

      {events.length === 0 && !error ? (
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <span className="font-mono text-2xl text-stamp-slate/40">◌</span>
          <p className="font-mono text-xs text-stamp-slate">
            Quiet quay. Start an inspection to light the feed.
          </p>
        </div>
      ) : (
        <ul className="relative z-[1] flex flex-1 flex-col gap-2.5">
          {events.map((ev, i) => (
            <li
              key={ev.id}
              className={`quay-feed-ingress quay-feed-item rounded-sm border px-3 py-2.5 transition hover:border-signal-cyan/50 ${statusTone(ev.status)} ${
                i === 0 ? "ring-1 ring-signal-cyan/40 shadow-[0_0_20px_-8px_rgba(34,211,238,0.5)]" : ""
              }`}
              style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(ev.status)}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <p className="font-mono text-[10px] uppercase tracking-wide text-stamp-slate">
                      {new Date(ev.created_at).toLocaleTimeString()}
                      {ev.status ? ` · ${ev.status}` : ""}
                    </p>
                    {ev.repo_url ? (
                      <p className="truncate font-mono text-[10px] text-manifest-200/50">
                        {shortRepo(ev.repo_url)}
                      </p>
                    ) : null}
                  </div>
                  {ev.scan_id ? (
                    <Link
                      href={`/scans/${ev.scan_id}`}
                      className="mt-1 block text-sm leading-snug text-manifest-100 hover:text-signal-teal"
                    >
                      {ev.message}
                    </Link>
                  ) : (
                    <p className="mt-1 text-sm leading-snug text-manifest-100">{ev.message}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
