"use client";

import { useState } from "react";
import type { Dependency, Finding, Scan } from "@/lib/api";
import { downloadJsonReport, openPdfReport } from "@/lib/exportReport";

type Props = {
  scan: Scan;
  deps: Dependency[];
  findings: Finding[];
};

export function ExportButtons({ scan, deps, findings }: Props) {
  const [error, setError] = useState<string | null>(null);

  function onJson() {
    setError(null);
    downloadJsonReport(scan, deps, findings);
  }

  function onPdf() {
    setError(null);
    try {
      openPdfReport(scan, deps, findings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onJson}
        className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:border-accent hover:text-accent"
      >
        Export JSON
      </button>
      <button
        type="button"
        onClick={onPdf}
        className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:border-accent hover:text-accent"
      >
        Export PDF
      </button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}
