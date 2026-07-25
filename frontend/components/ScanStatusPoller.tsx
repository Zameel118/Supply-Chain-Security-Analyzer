"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchScan, type Dependency, type Scan } from "@/lib/api";

const TERMINAL = new Set(["complete", "failed"]);

export function ScanStatusPoller({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ecosystemFilter, setEcosystemFilter] = useState<string>("all");
  const [directOnly, setDirectOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const data = await fetchScan(scanId);
        if (cancelled) return;
        setScan(data);
        // Dependencies now come embedded on the scan detail response
        if (Array.isArray(data.dependencies)) {
          setDeps(data.dependencies);
        }
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

  const ecosystems = useMemo(
    () => Array.from(new Set(deps.map((d) => d.ecosystem))).sort(),
    [deps],
  );

  const filtered = useMemo(() => {
    return deps.filter((d) => {
      if (ecosystemFilter !== "all" && d.ecosystem !== ecosystemFilter) return false;
      if (directOnly && !d.is_direct) return false;
      return true;
    });
  }, [deps, ecosystemFilter, directOnly]);

  if (error && !scan) {
    return <p className="text-red-300">{error}</p>;
  }
  if (!scan) {
    return <p className="text-slate-400">Loading scan…</p>;
  }

  const expectedCount = scan.dependency_count ?? deps.length;

  return (
    <div className="space-y-8">
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
          <dt className="text-xs uppercase tracking-wide text-slate-400">Dependencies</dt>
          <dd className="mt-1 text-lg text-white">{expectedCount}</dd>
        </div>
        <div className="border-l-2 border-accent/40 pl-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Project type</dt>
          <dd className="mt-1 text-lg text-white">{scan.project_type}</dd>
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
          Parsing dependency manifests… this page refreshes automatically.
        </p>
      ) : null}

      {scan.status === "failed" ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">
          {scan.error_message ?? "Scan failed"}
        </p>
      ) : null}

      {scan.status === "complete" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">Dependencies</h2>
              <p className="mt-1 text-sm text-slate-400">
                Parsed from manifests / lockfiles via the GitHub Contents API (static analysis only).
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2 text-slate-300">
                Ecosystem
                <select
                  value={ecosystemFilter}
                  onChange={(e) => setEcosystemFilter(e.target.value)}
                  className="rounded-md border border-white/15 bg-ink/60 px-2 py-1 text-white"
                >
                  <option value="all">All</option>
                  {ecosystems.map((eco) => (
                    <option key={eco} value={eco}>
                      {eco}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={(e) => setDirectOnly(e.target.checked)}
                />
                Direct only
              </label>
            </div>
          </div>

          {deps.length === 0 ? (
            <p className="text-sm text-slate-400">
              No supported manifests found (looked for package.json / package-lock.json,
              requirements.txt, Pipfile.lock, poetry.lock, Gemfile.lock, pom.xml).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Version</th>
                    <th className="px-3 py-2 font-medium">Ecosystem</th>
                    <th className="px-3 py-2 font-medium">Depth</th>
                    <th className="px-3 py-2 font-medium">Direct</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((dep) => (
                    <tr key={dep.id} className="border-t border-white/10 text-slate-200">
                      <td className="px-3 py-2 font-medium text-white">{dep.name}</td>
                      <td className="px-3 py-2">{dep.version ?? "—"}</td>
                      <td className="px-3 py-2">{dep.ecosystem}</td>
                      <td className="px-3 py-2">{dep.depth}</td>
                      <td className="px-3 py-2">{dep.is_direct ? "yes" : "no"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length < deps.length ? (
                <p className="border-t border-white/10 px-3 py-2 text-xs text-slate-400">
                  Showing {filtered.length} of {deps.length}
                </p>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
