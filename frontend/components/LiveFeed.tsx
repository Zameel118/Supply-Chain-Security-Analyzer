"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel } from "@/components/Panel";
import { fetchActivity, type ActivityEvent } from "@/lib/api";

function statusTone(status: string | null): string {
  if (status === "complete") return "border-signal-teal/50 bg-signal-teal/5";
  if (status === "failed") return "border-stamp-red/50 bg-stamp-red/5";
  if (status === "running") return "border-stamp-amber/50 bg-stamp-amber/5";
  return "border-stamp-slate/40 bg-ink-800/40";
}

function statusDot(status: string | null): string {
  if (status === "complete") return "bg-signal-teal";
  if (status === "failed") return "bg-stamp-red";
  if (status === "running") return "bg-stamp-amber quay-pulse";
  return "bg-stamp-slate";
}

function shortRepo(url: string | null): string {
  if (!url) return "";
  return url.replace(/^https:\/\/github\.com\//i, "");
}

export function LiveFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const data = await fetchActivity();
        if (!cancelled) {
          setEvents(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Feed unavailable");
        }
      }
      if (!cancelled) timer = setTimeout(tick, 4000);
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
      className="flex h-full min-h-[28rem] flex-col !bg-ink-950/90 quay-scanlines"
    >
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-manifest-200/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-signal-teal quay-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-signal-teal">
            Streaming · 4s
          </span>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-stamp-slate">
          {events.length} events
        </span>
      </div>

      {error ? <p className="text-sm text-stamp-red">{error}</p> : null}

      {events.length === 0 && !error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <span className="font-mono text-2xl text-stamp-slate/40">◌</span>
          <p className="font-mono text-xs text-stamp-slate">
            Quiet quay — start an inspection to light the feed.
          </p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2.5">
          {events.map((ev, i) => (
            <li
              key={ev.id}
              className={`quay-feed-item rounded-sm border px-3 py-2.5 transition hover:border-signal-teal/40 ${statusTone(ev.status)}`}
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
