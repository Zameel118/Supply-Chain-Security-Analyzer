"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchScan, type Dependency, type Finding, type Scan } from "@/lib/api";

const TERMINAL = new Set(["complete", "failed"]);

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-500/60 text-red-300",
  high: "border-orange-400/60 text-orange-200",
  medium: "border-amber-400/50 text-amber-200",
  low: "border-sky-400/50 text-sky-200",
  info: "border-slate-400/40 text-slate-300",
};

export function ScanStatusPoller({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ecosystemFilter, setEcosystemFilter] = useState<string>("all");
  const [directOnly, setDirectOnly] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const data = await fetchScan(scanId);
        if (cancelled) return;
        setScan(data);
        if (Array.isArray(data.dependencies)) setDeps(data.dependencies);
        if (Array.isArray(data.findings)) setFindings(data.findings);
        setError(null);
        if (!TERMINAL.has(data.status)) {
          timer = setTimeout(tick, 2000);
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

  const filteredDeps = useMemo(() => {
    return deps.filter((d) => {
      if (ecosystemFilter !== "all" && d.ecosystem !== ecosystemFilter) return false;
      if (directOnly && !d.is_direct) return false;
      return true;
    });
  }, [deps, ecosystemFilter, directOnly]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (typeFilter !== "all" && f.type !== typeFilter) return false;
      return true;
    });
  }, [findings, severityFilter, typeFilter]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of findings) {
      counts[f.severity] = (counts[f.severity] ?? 0) + 1;
    }
    return counts;
  }, [findings]);

  if (error && !scan) {
    return <p className="text-red-300">{error}</p>;
  }
  if (!scan) {
    return <p className="text-slate-400">Loading scan…</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-accent">Scan status</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">{scan.repo_url}</h1>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="border-l-2 border-accent/40 pl-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Status</dt>
          <dd className="mt-1 text-lg capitalize text-white">{scan.status}</dd>
        </div>
        <div className="border-l-2 border-accent/40 pl-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Dependencies</dt>
          <dd className="mt-1 text-lg text-white">{scan.dependency_count ?? deps.length}</dd>
        </div>
        <div className="border-l-2 border-accent/40 pl-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Vulnerabilities</dt>
          <dd className="mt-1 text-lg text-white">
            {scan.vulnerability_count ?? findings.filter((f) => f.type === "vulnerability").length}
          </dd>
        </div>
        <div className="border-l-2 border-accent/40 pl-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Typosquats</dt>
          <dd className="mt-1 text-lg text-white">
            {scan.typosquat_count ?? findings.filter((f) => f.type === "typosquat").length}
          </dd>
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
          Parsing manifests and querying OSV.dev… this can take a minute for large lockfiles.
        </p>
      ) : null}

      {scan.status === "failed" ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">
          {scan.error_message ?? "Scan failed"}
        </p>
      ) : null}

      {scan.status === "complete" ? (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-white">
                  Security findings
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Vulnerabilities from OSV.dev, plus typosquat lookalikes against popular package
                  names. Critical/high transitive vulns are also surfaced on the direct parent.
                </p>
                {Object.keys(severityCounts).length > 0 ? (
                  <p className="mt-2 text-xs text-slate-400">
                    {Object.entries(severityCounts)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2 text-slate-300">
                  Type
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-md border border-white/15 bg-ink/60 px-2 py-1 text-white"
                  >
                    <option value="all">All</option>
                    <option value="vulnerability">Vulnerability</option>
                    <option value="typosquat">Typosquat</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  Severity
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="rounded-md border border-white/15 bg-ink/60 px-2 py-1 text-white"
                  >
                    <option value="all">All</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                  </select>
                </label>
              </div>
            </div>

            {findings.length === 0 ? (
              <p className="text-sm text-accent">No vulnerability or typosquat findings.</p>
            ) : (
              <ul className="space-y-3">
                {filteredFindings.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs uppercase tracking-wide ${SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.info}`}
                      >
                        {f.severity}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        {f.type}
                      </span>
                    </div>
                    <h3 className="mt-2 font-medium text-white">{f.title}</h3>
                    {f.dependency_name ? (
                      <p className="mt-1 text-sm text-slate-400">
                        Package: {f.dependency_name}
                        {f.dependency_version ? `@${f.dependency_version}` : ""}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.description}</p>
                    {f.remediation ? (
                      <p className="mt-2 text-sm text-accent">Fix: {f.remediation}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-white">Dependencies</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Parsed from manifests / lockfiles via the GitHub Contents API.
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
              <p className="text-sm text-slate-400">No supported manifests found.</p>
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
                    {filteredDeps.map((dep) => (
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
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
