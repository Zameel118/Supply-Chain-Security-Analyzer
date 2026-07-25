"use client";

import { useEffect, useMemo, useState } from "react";
import { DependencyGraph } from "@/components/DependencyGraph";
import { ExportButtons } from "@/components/ExportButtons";
import { SeverityChart } from "@/components/SeverityChart";
import { fetchScan, type Dependency, type Finding, type Scan } from "@/lib/api";
import { countBySeverity } from "@/lib/risk";

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

  const severityCounts = useMemo(() => countBySeverity(findings), [findings]);

  const summaryCards = useMemo(() => {
    if (!scan) return [];
    return [
      { label: "Dependencies", value: scan.dependency_count ?? deps.length },
      {
        label: "Vulnerabilities",
        value:
          scan.vulnerability_count ??
          findings.filter((f) => f.type === "vulnerability").length,
      },
      {
        label: "Typosquats",
        value: scan.typosquat_count ?? findings.filter((f) => f.type === "typosquat").length,
      },
      {
        label: "Dep confusion",
        value:
          scan.dep_confusion_count ??
          findings.filter((f) => f.type === "dep_confusion").length,
      },
      {
        label: "CI/CD",
        value: scan.cicd_count ?? findings.filter((f) => f.type === "cicd").length,
      },
      {
        label: "Secrets",
        value: scan.secret_count ?? findings.filter((f) => f.type === "secret").length,
      },
      {
        label: "Licenses",
        value: scan.license_count ?? findings.filter((f) => f.type === "license").length,
      },
      {
        label: "Total findings",
        value: scan.finding_count ?? findings.length,
      },
    ];
  }, [scan, deps.length, findings]);

  if (error && !scan) {
    return <p className="text-red-300">{error}</p>;
  }
  if (!scan) {
    return <p className="text-slate-400">Loading scan…</p>;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-accent">Scan report</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">
            {scan.repo_url.replace(/^https:\/\/github\.com\//i, "")}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Status: <span className="capitalize text-slate-200">{scan.status}</span>
            {" · "}
            Project: {scan.project_type}
            {scan.completed_at
              ? ` · Completed ${new Date(scan.completed_at).toLocaleString()}`
              : null}
          </p>
        </div>
        {scan.status === "complete" ? (
          <ExportButtons scan={scan} deps={deps} findings={findings} />
        ) : null}
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="border-l-2 border-accent/40 pl-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">{card.label}</dt>
            <dd className="mt-1 text-lg text-white">{card.value}</dd>
          </div>
        ))}
      </dl>

      {scan.status === "queued" || scan.status === "running" ? (
        <p className="text-sm text-amber-200">
          Parsing manifests and running analyzers… this can take 1–2 minutes for large repos.
        </p>
      ) : null}

      {scan.status === "failed" ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">
          {scan.error_message ?? "Scan failed"}
        </p>
      ) : null}

      {scan.status === "complete" ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Findings by severity
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Distribution across all finding types.
              </p>
              <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
                <SeverityChart counts={severityCounts} />
              </div>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Dependency graph
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Parent → child edges from lockfile / manifest relationships.
              </p>
              <div className="mt-4">
                <DependencyGraph dependencies={deps} findings={findings} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-white">
                  Security findings
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Filter by type and severity. Each row includes remediation when available.
                </p>
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
                    <option value="dep_confusion">Dep confusion</option>
                    <option value="cicd">CI/CD</option>
                    <option value="secret">Secret</option>
                    <option value="license">License</option>
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
              <p className="text-sm text-accent">No findings for this scan.</p>
            ) : filteredFindings.length === 0 ? (
              <p className="text-sm text-slate-400">No findings match the current filters.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Severity</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Package / file</th>
                      <th className="px-3 py-2 font-medium">Remediation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.map((f) => (
                      <tr key={f.id} className="border-t border-white/10 align-top text-slate-200">
                        <td className="px-3 py-2">
                          <span
                            className={`rounded border px-2 py-0.5 text-xs uppercase tracking-wide ${SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.info}`}
                          >
                            {f.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400">
                          {f.type}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-white">{f.title}</p>
                          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                            {f.description}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {f.dependency_name
                            ? `${f.dependency_name}${f.dependency_version ? `@${f.dependency_version}` : ""}`
                            : null}
                          {f.file_path
                            ? `${f.dependency_name ? " · " : ""}${f.file_path}${f.line_number ? `:${f.line_number}` : ""}`
                            : null}
                          {!f.dependency_name && !f.file_path ? "—" : null}
                        </td>
                        <td className="max-w-xs px-3 py-2 text-accent">
                          {f.remediation ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
