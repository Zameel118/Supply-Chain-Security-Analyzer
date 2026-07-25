"use client";

import Link from "next/link";
import type { Scan } from "@/lib/api";

type Props = {
  scans: Scan[];
};

function StatusPill({ status }: { status: Scan["status"] }) {
  const colors: Record<Scan["status"], string> = {
    queued: "border-slate-400/40 text-slate-300",
    running: "border-amber-400/50 text-amber-200",
    complete: "border-accent/50 text-accent",
    failed: "border-danger/50 text-red-300",
  };
  return (
    <span
      className={`shrink-0 rounded border px-2 py-0.5 text-xs uppercase tracking-wide ${colors[status]}`}
    >
      {status}
    </span>
  );
}

export function ScanHistory({ scans }: Props) {
  if (scans.length === 0) {
    return <p className="mt-3 text-sm text-slate-400">No scans yet.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-2 font-medium">Repository</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Deps</th>
            <th className="px-3 py-2 font-medium">Findings</th>
            <th className="px-3 py-2 font-medium">Started</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <tr key={scan.id} className="border-t border-white/10 text-slate-200">
              <td className="max-w-xs truncate px-3 py-2">
                <Link href={`/scans/${scan.id}`} className="text-white hover:text-accent">
                  {scan.repo_url.replace(/^https:\/\/github\.com\//i, "")}
                </Link>
              </td>
              <td className="px-3 py-2">
                <StatusPill status={scan.status} />
              </td>
              <td className="px-3 py-2">{scan.dependency_count ?? "—"}</td>
              <td className="px-3 py-2">{scan.finding_count ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                {new Date(scan.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
