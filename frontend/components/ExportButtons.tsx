"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import type { Dependency, Finding, Scan } from "@/lib/api";
import { downloadJsonReport, openPdfReport } from "@/lib/exportReport";

type Props = {
  scan: Scan;
  deps: Dependency[];
  findings: Finding[];
};

export function ExportButtons({ scan, deps, findings }: Props) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        type="button"
        className="!py-1.5 !text-xs"
        onClick={() => {
          setError(null);
          downloadJsonReport(scan, deps, findings);
        }}
      >
        Export JSON
      </Button>
      <Button
        variant="secondary"
        type="button"
        className="!py-1.5 !text-xs"
        onClick={() => {
          setError(null);
          try {
            openPdfReport(scan, deps, findings);
          } catch (err) {
            setError(err instanceof Error ? err.message : "PDF export failed");
          }
        }}
      >
        Export PDF
      </Button>
      {error ? <span className="font-mono text-[10px] text-stamp-red">{error}</span> : null}
    </div>
  );
}
