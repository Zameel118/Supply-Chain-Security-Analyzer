import type { Dependency, Finding, Scan } from "@/lib/api";
import { countBySeverity } from "@/lib/risk";

export type ReportPayload = {
  exported_at: string;
  scan: {
    id: string;
    repo_url: string;
    status: string;
    project_type: string;
    private_package_prefix: string | null;
    created_at: string;
    completed_at: string | null;
    counts: {
      dependencies: number;
      findings: number;
      vulnerability: number;
      typosquat: number;
      dep_confusion: number;
      cicd: number;
      secret: number;
      license: number;
      by_severity: Record<string, number>;
    };
  };
  dependencies: Dependency[];
  findings: Finding[];
};

export function buildReportPayload(
  scan: Scan,
  deps: Dependency[],
  findings: Finding[],
): ReportPayload {
  return {
    exported_at: new Date().toISOString(),
    scan: {
      id: scan.id,
      repo_url: scan.repo_url,
      status: scan.status,
      project_type: scan.project_type,
      private_package_prefix: scan.private_package_prefix,
      created_at: scan.created_at,
      completed_at: scan.completed_at,
      counts: {
        dependencies: scan.dependency_count ?? deps.length,
        findings: scan.finding_count ?? findings.length,
        vulnerability: scan.vulnerability_count ?? 0,
        typosquat: scan.typosquat_count ?? 0,
        dep_confusion: scan.dep_confusion_count ?? 0,
        cicd: scan.cicd_count ?? 0,
        secret: scan.secret_count ?? 0,
        license: scan.license_count ?? 0,
        by_severity: countBySeverity(findings),
      },
    },
    dependencies: deps,
    findings,
  };
}

function safeFilename(repoUrl: string, scanId: string): string {
  const slug = repoUrl.replace(/https?:\/\/github\.com\//i, "").replace(/[^\w.-]+/g, "_");
  return `scsa-${slug || "scan"}-${scanId.slice(0, 8)}`;
}

export function downloadJsonReport(
  scan: Scan,
  deps: Dependency[],
  findings: Finding[],
): void {
  const payload = buildReportPayload(scan, deps, findings);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(scan.repo_url, scan.id)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Opens a print-friendly HTML report; user can Save as PDF from the print dialog. */
export function openPdfReport(
  scan: Scan,
  deps: Dependency[],
  findings: Finding[],
): void {
  const payload = buildReportPayload(scan, deps, findings);
  const severityRows = Object.entries(payload.scan.counts.by_severity)
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`)
    .join("");

  const findingRows = findings
    .map(
      (f) => `<tr>
        <td>${escapeHtml(f.severity)}</td>
        <td>${escapeHtml(f.type)}</td>
        <td>${escapeHtml(f.title)}</td>
        <td>${escapeHtml(f.dependency_name ?? f.file_path ?? "—")}</td>
        <td>${escapeHtml(f.remediation ?? "—")}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SCSA Report — ${escapeHtml(scan.repo_url)}</title>
  <style>
    body { font-family: Georgia, serif; color: #111; margin: 2rem; line-height: 1.4; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.15rem; margin-top: 1.75rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
    .meta { color: #444; font-size: 0.9rem; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5rem; }
    th, td { border: 1px solid #ddd; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; }
    @media print { body { margin: 0.75in; } }
  </style>
</head>
<body>
  <h1>Supply Chain Security Analyzer</h1>
  <p class="meta">
    ${escapeHtml(scan.repo_url)} · ${escapeHtml(scan.project_type)} ·
    exported ${escapeHtml(payload.exported_at)}
  </p>
  <h2>Summary</h2>
  <ul>
    <li>Dependencies: ${payload.scan.counts.dependencies}</li>
    <li>Findings: ${payload.scan.counts.findings}</li>
    <li>Vulnerabilities: ${payload.scan.counts.vulnerability}</li>
    <li>Typosquats: ${payload.scan.counts.typosquat}</li>
    <li>Dep confusion: ${payload.scan.counts.dep_confusion}</li>
    <li>CI/CD: ${payload.scan.counts.cicd}</li>
    <li>Secrets: ${payload.scan.counts.secret}</li>
    <li>Licenses: ${payload.scan.counts.license}</li>
  </ul>
  <h2>Findings by severity</h2>
  <table>
    <thead><tr><th>Severity</th><th>Count</th></tr></thead>
    <tbody>${severityRows || "<tr><td colspan='2'>None</td></tr>"}</tbody>
  </table>
  <h2>Findings (${findings.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Severity</th><th>Type</th><th>Title</th><th>Package / file</th><th>Remediation</th>
      </tr>
    </thead>
    <tbody>${findingRows || "<tr><td colspan='5'>No findings</td></tr>"}</tbody>
  </table>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    throw new Error("Pop-up blocked — allow pop-ups to export PDF");
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
