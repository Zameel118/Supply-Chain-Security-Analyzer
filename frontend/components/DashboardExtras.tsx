"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { createScan, type Scan } from "@/lib/api";

const WATCH_KEY = "quaywatch_watchlist";

function loadWatch(): string[] {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveWatch(list: string[]) {
  localStorage.setItem(WATCH_KEY, JSON.stringify(list.slice(0, 12)));
}

type Props = {
  scans: Scan[];
};

/** Severity mix across recent complete scans. */
export function RiskPulse({ scans }: Props) {
  const complete = scans.filter((s) => s.status === "complete").slice(0, 12);
  const totals = useMemo(() => {
    let vulns = 0;
    let secrets = 0;
    let licenses = 0;
    let other = 0;
    for (const s of complete) {
      vulns += s.vulnerability_count ?? 0;
      secrets += (s.secret_count ?? 0) + (s.cicd_count ?? 0);
      licenses += s.license_count ?? 0;
      other +=
        (s.typosquat_count ?? 0) +
        (s.dep_confusion_count ?? 0);
    }
    return { vulns, secrets, licenses, other };
  }, [complete]);

  const sum = Math.max(totals.vulns + totals.secrets + totals.licenses + totals.other, 1);
  const bars = [
    { label: "Vulns", n: totals.vulns, color: "bg-stamp-red" },
    { label: "CI/Secrets", n: totals.secrets, color: "bg-stamp-amber" },
    { label: "Licenses", n: totals.licenses, color: "bg-signal-teal" },
    { label: "Other", n: totals.other, color: "bg-stamp-slate" },
  ];

  return (
    <Panel label="Risk pulse" data-tour="risk" className="!bg-ink-950/80">
      <p className="mb-3 font-mono text-[10px] text-stamp-slate">
        Across last {complete.length || 0} cleared berths
      </p>
      <div className="space-y-2.5">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex justify-between font-mono text-[11px]">
              <span className="text-manifest-200/80">{b.label}</span>
              <span className="tabular-nums text-manifest-100">{b.n}</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-ink-800">
              <div
                className={`h-full ${b.color} transition-all duration-500`}
                style={{ width: `${Math.max(b.n ? 6 : 0, (b.n / sum) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Pin repos for one-click re-scan. */
export function WatchlistPanel({ scans }: Props) {
  const router = useRouter();
  const [list, setList] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setList(loadWatch());
  }, []);

  const suggestions = useMemo(() => {
    const urls = Array.from(new Set(scans.map((s) => s.repo_url)));
    return urls.filter((u) => !list.includes(u)).slice(0, 5);
  }, [scans, list]);

  function add(url: string) {
    const next = [url, ...list.filter((x) => x !== url)].slice(0, 12);
    setList(next);
    saveWatch(next);
  }

  function remove(url: string) {
    const next = list.filter((x) => x !== url);
    setList(next);
    saveWatch(next);
  }

  async function rescan(url: string) {
    setBusy(url);
    setError(null);
    try {
      const scan = await createScan({ repo_url: url, project_type: "commercial" });
      router.push(`/scans/${scan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rescan failed");
      setBusy(null);
    }
  }

  return (
    <Panel label="Watchlist" data-tour="watch" className="!bg-ink-950/80">
      <p className="mb-3 font-mono text-[10px] text-stamp-slate">
        Pin repos for instant re-inspection
      </p>
      {list.length === 0 ? (
        <p className="font-mono text-xs text-stamp-slate">No pins yet. Add from recent berths.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((url) => (
            <li
              key={url}
              className="flex flex-wrap items-center gap-2 border border-manifest-200/10 bg-ink-800/50 px-2.5 py-2"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-manifest-100">
                {url.replace(/^https:\/\/github\.com\//i, "")}
              </span>
              <Button
                type="button"
                className="!px-2 !py-1 !text-[10px]"
                disabled={busy === url}
                onClick={() => rescan(url)}
              >
                {busy === url ? "…" : "Rescan"}
              </Button>
              <button
                type="button"
                className="font-mono text-[10px] text-stamp-slate hover:text-stamp-red"
                onClick={() => remove(url)}
              >
                Unpin
              </button>
            </li>
          ))}
        </ul>
      )}
      {suggestions.length > 0 ? (
        <div className="mt-3 border-t border-manifest-200/10 pt-3">
          <p className="mb-2 font-mono text-[10px] uppercase text-stamp-slate">Add recent</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => add(url)}
                className="border border-manifest-200/15 px-2 py-1 font-mono text-[10px] text-manifest-200/80 hover:border-signal-teal hover:text-signal-teal"
              >
                + {url.replace(/^https:\/\/github\.com\//i, "").split("/").pop()}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-stamp-red">{error}</p> : null}
    </Panel>
  );
}

/** Which analyzers have been firing recently. */
export function AnalyzerCoverage({ scans }: Props) {
  const complete = scans.filter((s) => s.status === "complete").slice(0, 20);
  const rows = [
    {
      id: "vuln",
      label: "Vulnerabilities",
      hit: complete.reduce((n, s) => n + (s.vulnerability_count ?? 0), 0),
    },
    {
      id: "typo",
      label: "Typosquats",
      hit: complete.reduce((n, s) => n + (s.typosquat_count ?? 0), 0),
    },
    {
      id: "conf",
      label: "Dep confusion",
      hit: complete.reduce((n, s) => n + (s.dep_confusion_count ?? 0), 0),
    },
    {
      id: "cicd",
      label: "CI/CD",
      hit: complete.reduce((n, s) => n + (s.cicd_count ?? 0), 0),
    },
    {
      id: "sec",
      label: "Secrets",
      hit: complete.reduce((n, s) => n + (s.secret_count ?? 0), 0),
    },
    {
      id: "lic",
      label: "Licenses",
      hit: complete.reduce((n, s) => n + (s.license_count ?? 0), 0),
    },
  ];

  return (
    <Panel label="Analyzer coverage" className="!bg-ink-950/80">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`border px-2.5 py-2 ${
              r.hit > 0
                ? "border-stamp-amber/40 bg-stamp-amber/5"
                : "border-signal-teal/25 bg-signal-teal/5"
            }`}
          >
            <p className="font-mono text-[9px] uppercase tracking-wide text-stamp-slate">{r.label}</p>
            <p
              className={`mt-1 font-mono text-lg tabular-nums ${
                r.hit > 0 ? "text-stamp-amber" : "text-signal-teal"
              }`}
            >
              {r.hit}
            </p>
            <p className="font-mono text-[9px] text-stamp-slate">
              {r.hit > 0 ? "signals" : "quiet"}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
