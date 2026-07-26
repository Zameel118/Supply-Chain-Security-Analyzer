"use client";

import Link from "next/link";
import { StampBadge } from "@/components/StampBadge";
import type { Scan } from "@/lib/api";

type Props = {
  scans: Scan[];
};

function statusStamp(status: Scan["status"]): Parameters<typeof StampBadge>[0]["severity"] {
  if (status === "complete") return "cleared";
  if (status === "failed") return "critical";
  if (status === "running") return "medium";
  return "info";
}

export function ScanHistory({ scans }: Props) {
  if (scans.length === 0) {
    return (
      <p className="border border-manifest-200/10 bg-ink-800/50 px-4 py-6 font-mono text-sm text-stamp-slate">
        No inspections yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-manifest-200/15">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-ink-800 font-display text-[10px] font-bold uppercase tracking-wide text-manifest-200/60">
          <tr>
            <th className="px-3 py-2.5">Repository</th>
            <th className="px-3 py-2.5">Stamp</th>
            <th className="px-3 py-2.5">Deps</th>
            <th className="px-3 py-2.5">Findings</th>
            <th className="px-3 py-2.5">Started</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <tr
              key={scan.id}
              className="border-t border-manifest-200/10 text-manifest-200/90 hover:bg-signal-teal/5"
            >
              <td className="max-w-xs truncate px-3 py-3">
                <Link
                  href={`/scans/${scan.id}`}
                  className="font-mono text-xs text-manifest-100 hover:text-signal-teal"
                >
                  {scan.repo_url.replace(/^https:\/\/github\.com\//i, "")}
                </Link>
              </td>
              <td className="px-3 py-3">
                <StampBadge
                  severity={statusStamp(scan.status)}
                  seed={scan.id}
                  size="sm"
                >
                  {scan.status.toUpperCase()}
                </StampBadge>
              </td>
              <td className="px-3 py-3 font-mono text-xs tabular-nums">
                {scan.dependency_count ?? "-"}
              </td>
              <td className="px-3 py-3 font-mono text-xs tabular-nums">
                {scan.finding_count ?? "-"}
              </td>
              <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-stamp-slate">
                {new Date(scan.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
