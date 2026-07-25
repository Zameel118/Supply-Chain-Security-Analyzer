"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ScanStatusPoller } from "@/components/ScanStatusPoller";
import { fetchPublicReport, type Scan } from "@/lib/api";

export default function PublicReportPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPublicReport(token)
      .then(setScan)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  return (
    <AppShell marketing>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-signal-teal">
          Public inspection report
        </p>
        {error ? <p className="mt-4 text-stamp-red">{error}</p> : null}
        {!scan && !error ? (
          <p className="mt-4 font-mono text-stamp-slate">Loading report…</p>
        ) : null}
        {scan ? (
          <div className="mt-6">
            <ScanStatusPoller scanId={scan.id} readOnly initialScan={scan} />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
