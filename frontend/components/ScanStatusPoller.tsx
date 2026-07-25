"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { CheckpointBelt } from "@/components/CheckpointBelt";
import { DependencyGraph } from "@/components/DependencyGraph";
import { ExportButtons } from "@/components/ExportButtons";
import { Panel } from "@/components/Panel";
import { SeverityChart } from "@/components/SeverityChart";
import { SharePanel } from "@/components/SharePanel";
import { StampBadge, severityToStamp } from "@/components/StampBadge";
import { TrendSparkline } from "@/components/TrendSparkline";
import { fetchScan, fetchScans, type Dependency, type Finding, type Scan } from "@/lib/api";
import { countBySeverity } from "@/lib/risk";

const TERMINAL = new Set(["complete", "failed"]);

type Props = {
  scanId: string;
  /** Public report mode — hide share controls that require auth */
  readOnly?: boolean;
  initialScan?: Scan | null;
};

export function ScanStatusPoller({ scanId, readOnly = false, initialScan = null }: Props) {
  const [scan, setScan] = useState<Scan | null>(initialScan);
  const [deps, setDeps] = useState<Dependency[]>(initialScan?.dependencies ?? []);
  const [findings, setFindings] = useState<Finding[]>(initialScan?.findings ?? []);
  const [history, setHistory] = useState<Scan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ecosystemFilter, setEcosystemFilter] = useState("all");
  const [directOnly, setDirectOnly] = useState(false);

  useEffect(() => {
    if (readOnly) return;
    fetchScans()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [readOnly]);

  useEffect(() => {
    if (readOnly && initialScan) return;
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
  }, [scanId, readOnly, initialScan]);

  const severityCounts = useMemo(() => countBySeverity(findings), [findings]);
  const ecosystems = useMemo(
    () => Array.from(new Set(deps.map((d) => d.ecosystem))).sort(),
    [deps],
  );

  const filteredFindings = useMemo(
    () =>
      findings.filter((f) => {
        if (severityFilter !== "all" && f.severity !== severityFilter) return false;
        if (typeFilter !== "all" && f.type !== typeFilter) return false;
        return true;
      }),
    [findings, severityFilter, typeFilter],
  );

  const filteredDeps = useMemo(
    () =>
      deps.filter((d) => {
        if (ecosystemFilter !== "all" && d.ecosystem !== ecosystemFilter) return false;
        if (directOnly && !d.is_direct) return false;
        return true;
      }),
    [deps, ecosystemFilter, directOnly],
  );

  const overallStamp = useMemo(() => {
    if (!scan || scan.status !== "complete") return null;
    if ((severityCounts.critical ?? 0) > 0) return "critical" as const;
    if ((severityCounts.high ?? 0) > 0) return "high" as const;
    if (findings.length > 0) return "medium" as const;
    return "cleared" as const;
  }, [scan, severityCounts, findings.length]);

  if (error && !scan) return <p className="text-stamp-red">{error}</p>;
  if (!scan) return <p className="font-mono text-stamp-slate">Loading berth…</p>;

  const shortRepo = scan.repo_url.replace(/^https:\/\/github\.com\//i, "");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-signal-teal">
            Inspection ledger
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-manifest-100">
            {shortRepo}
          </h1>
          <p className="mt-2 font-mono text-xs text-stamp-slate">
            {scan.status}
            {scan.current_phase ? ` · ${scan.current_phase}` : ""} · {scan.project_type}
            {scan.completed_at
              ? ` · ${new Date(scan.completed_at).toLocaleString()}`
              : null}
          </p>
          {scan.diff && scan.status === "complete" ? (
            <p className="mt-2 font-mono text-xs">
              Since last scan:{" "}
              <span className="text-stamp-red">+{scan.diff.new_count} new</span>
              {" · "}
              <span className="text-signal-teal">{scan.diff.resolved_count} resolved</span>
              {" · "}
              <span className="text-stamp-slate">{scan.diff.known_count} known</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {overallStamp ? (
            <StampBadge severity={overallStamp} seed={scan.id} />
          ) : null}
          {scan.status === "complete" && !readOnly ? (
            <ExportButtons scan={scan} deps={deps} findings={findings} />
          ) : null}
        </div>
      </div>

      {(scan.status === "queued" || scan.status === "running") && (
        <Panel label="Checkpoint belt">
          <CheckpointBelt status={scan.status} currentPhase={scan.current_phase} />
        </Panel>
      )}

      {scan.status === "failed" ? (
        <p className="border border-stamp-red/40 bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red">
          {scan.error_message ?? "Inspection failed"}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Dependencies", value: scan.dependency_count ?? deps.length },
          { label: "Vulnerabilities", value: scan.vulnerability_count ?? 0 },
          { label: "CI / Secrets", value: (scan.cicd_count ?? 0) + (scan.secret_count ?? 0) },
          { label: "Total findings", value: scan.finding_count ?? findings.length },
        ].map((card) => (
          <div
            key={card.label}
            className="border border-manifest-200/15 bg-ink-800/60 px-4 py-3"
          >
            <p className="font-display text-[10px] font-bold uppercase tracking-wide text-stamp-slate">
              {card.label}
            </p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-manifest-100">{card.value}</p>
          </div>
        ))}
      </div>

      {scan.status === "complete" ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel label="Dependency graph">
              <DependencyGraph dependencies={deps} findings={findings} />
            </Panel>
            <div className="space-y-6">
              <Panel label="Severity breakdown">
                <SeverityChart counts={severityCounts} />
              </Panel>
              {!readOnly ? (
                <Panel>
                  <TrendSparkline scans={history} repoUrl={scan.repo_url} />
                </Panel>
              ) : null}
              {!readOnly ? (
                <SharePanel
                  scan={scan}
                  onTokenChange={(t) =>
                    setScan((prev) => (prev ? { ...prev, public_share_token: t } : prev))
                  }
                />
              ) : null}
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold uppercase tracking-wide text-manifest-100">
                  Manifest ledger
                </h2>
                <p className="mt-1 font-mono text-xs text-stamp-slate">
                  Expand a row for description & remediation
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2 font-sans text-manifest-200/80">
                  Type
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="border border-manifest-200/20 bg-ink-950 px-2 py-1 font-mono text-xs text-manifest-100"
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
                <label className="flex items-center gap-2 font-sans text-manifest-200/80">
                  Severity
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="border border-manifest-200/20 bg-ink-950 px-2 py-1 font-mono text-xs text-manifest-100"
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
              <div className="border border-signal-teal/30 bg-signal-teal/5 px-4 py-6">
                <StampBadge severity="cleared" seed={`${scan.id}-clear`} />
                <p className="mt-3 font-mono text-sm text-signal-teal">
                  Berth cleared — no findings on this inspection.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-manifest-200/15">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-ink-800 font-display text-[10px] font-bold uppercase tracking-wide text-manifest-200/60">
                    <tr>
                      <th className="px-3 py-2">Stamp</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Package / file</th>
                      <th className="px-3 py-2">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.map((f) => (
                      <Fragment key={f.id}>
                        <tr
                          className="cursor-pointer border-t border-manifest-200/10 hover:bg-signal-teal/5"
                          onClick={() => setExpanded((id) => (id === f.id ? null : f.id))}
                        >
                          <td className="px-3 py-2.5">
                            <StampBadge
                              severity={severityToStamp(f.severity)}
                              seed={f.id}
                              size="sm"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] uppercase text-stamp-slate">
                            {f.type}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-manifest-100">{f.title}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-manifest-200/80">
                            {f.dependency_name
                              ? `${f.dependency_name}${f.dependency_version ? `@${f.dependency_version}` : ""}`
                              : null}
                            {f.file_path
                              ? `${f.dependency_name ? " · " : ""}${f.file_path}${f.line_number ? `:${f.line_number}` : ""}`
                              : null}
                            {!f.dependency_name && !f.file_path ? "—" : null}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">
                            {f.is_new ? (
                              <span className="text-stamp-red">NEW</span>
                            ) : (
                              <span className="text-stamp-slate">—</span>
                            )}
                          </td>
                        </tr>
                        {expanded === f.id ? (
                          <tr className="border-t border-manifest-200/5 bg-ink-950/80">
                            <td colSpan={5} className="px-4 py-3">
                              <p className="text-sm leading-relaxed text-manifest-200/80">
                                {f.description}
                              </p>
                              {f.remediation ? (
                                <p className="mt-2 font-mono text-xs text-signal-teal">
                                  Fix: {f.remediation}
                                </p>
                              ) : null}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-xl font-bold uppercase tracking-wide text-manifest-100">
                Cargo list
              </h2>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2 text-manifest-200/80">
                  Ecosystem
                  <select
                    value={ecosystemFilter}
                    onChange={(e) => setEcosystemFilter(e.target.value)}
                    className="border border-manifest-200/20 bg-ink-950 px-2 py-1 font-mono text-xs"
                  >
                    <option value="all">All</option>
                    {ecosystems.map((eco) => (
                      <option key={eco} value={eco}>
                        {eco}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-manifest-200/80">
                  <input
                    type="checkbox"
                    checked={directOnly}
                    onChange={(e) => setDirectOnly(e.target.checked)}
                  />
                  Direct only
                </label>
              </div>
            </div>
            <div className="overflow-x-auto border border-manifest-200/15">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-ink-800 font-display text-[10px] font-bold uppercase tracking-wide text-manifest-200/60">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Version</th>
                    <th className="px-3 py-2">Ecosystem</th>
                    <th className="px-3 py-2">Depth</th>
                    <th className="px-3 py-2">Direct</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeps.map((dep) => (
                    <tr key={dep.id} className="border-t border-manifest-200/10">
                      <td className="px-3 py-2 font-mono text-xs text-manifest-100">{dep.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{dep.version ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-stamp-slate">{dep.ecosystem}</td>
                      <td className="px-3 py-2 font-mono text-xs">{dep.depth}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {dep.is_direct ? "yes" : "no"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
