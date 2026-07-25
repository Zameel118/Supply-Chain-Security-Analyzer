"use client";

import { useEffect, useState } from "react";
import { fetchScan, type Scan } from "@/lib/api";

const TERMINAL = new Set(["complete", "failed"]);

export function ScanStatusPoller({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const data = await fetchScan(scanId);
        if (cancelled) return;
        setScan(data);
        setError(null);
        if (!TERMINAL.has(data.status)) {
          timer = setTimeout(tick, 1500);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load scan");
        timer = setTimeout(tick, 3000);
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [scanId]);

  if (error && !scan) {
    return <p className="text-red-300">{error}</p>;
  }
  if (!scan) {
    return <p className="text-slate-400">Loading scan…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-accent">Scan status</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">{scan.repo_url}</h1>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="border-l-2 border-accent/40 pl-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Status</dt>
          <dd className="mt-1 text-lg capitalize text-white">{scan.status}</dd>
        </div>
        <div className="border-l-2 border-accent/40 pl-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Project type</dt>
          <dd className="mt-1 text-lg text-white">{scan.project_type}</dd>
        </div>
        <div className="border-l-2 border-accent/40 pl-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Created</dt>
          <dd className="mt-1 text-sm text-slate-200">{new Date(scan.created_at).toLocaleString()}</dd>
        </div>
        <div className="border-l-2 border-accent/40 pl-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Completed</dt>
          <dd className="mt-1 text-sm text-slate-200">
            {scan.completed_at ? new Date(scan.completed_at).toLocaleString() : "—"}
          </dd>
        </div>
      </dl>

      {scan.status === "queued" || scan.status === "running" ? (
        <p className="text-sm text-amber-200">
          Worker is processing this scan… this page refreshes automatically.
        </p>
      ) : null}

      {scan.status === "complete" ? (
        <p className="text-sm text-accent">
          Repo verified. Dependency analysis (Phase 2+) will fill findings on this page next.
        </p>
      ) : null}

      {scan.status === "failed" ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">
          {scan.error_message ?? "Scan failed"}
        </p>
      ) : null}
    </div>
  );
}
