import type { Finding } from "@/lib/api";

export const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

export const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#fbbf24",
  low: "#38bdf8",
  info: "#94a3b8",
  none: "#2dd4bf",
};

export function severityRank(severity: string): number {
  const idx = SEVERITY_ORDER.indexOf(severity as (typeof SEVERITY_ORDER)[number]);
  return idx === -1 ? 99 : idx;
}

/** Highest (worst) severity among findings for a dependency id. */
export function riskForDependency(
  dependencyId: string,
  findings: Finding[],
): string | null {
  let best: string | null = null;
  let bestRank = 99;
  for (const f of findings) {
    if (f.dependency_id !== dependencyId) continue;
    const r = severityRank(f.severity);
    if (r < bestRank) {
      bestRank = r;
      best = f.severity;
    }
  }
  return best;
}

export function countBySeverity(findings: Finding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  return counts;
}
