"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import {
  badgeSvgUrl,
  enableShare,
  getApiUrl,
  revokeShare,
  type Scan,
} from "@/lib/api";

type Props = {
  scan: Scan;
  onTokenChange: (token: string | null) => void;
};

export function SharePanel({ scan, onTokenChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = scan.public_share_token ?? null;
  const publicUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/report/${token}`
    : null;
  const badgeUrl = badgeSvgUrl(scan.id);
  const markdown = `[![Quaywatch](${badgeUrl})](${getApiUrl(`/api/scans/${scan.id}`)})`;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (token) {
        await revokeShare(scan.id);
        onTokenChange(null);
      } else {
        const res = await enableShare(scan.id);
        onTokenChange(res.public_share_token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel label="Share & badge">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" type="button" disabled={busy} onClick={toggle}>
          {token ? "Revoke public link" : "Make report public"}
        </Button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={badgeUrl} alt="Quaywatch badge" className="h-7" />
      </div>
      {publicUrl ? (
        <p className="mt-3 break-all font-mono text-xs text-signal-teal">{publicUrl}</p>
      ) : (
        <p className="mt-3 font-mono text-xs text-stamp-slate">
          Public link disabled: only you can view this berth.
        </p>
      )}
      <p className="mt-3 font-display text-[10px] font-bold uppercase tracking-wide text-manifest-200/60">
        README embed
      </p>
      <pre className="mt-1 overflow-x-auto border border-manifest-200/10 bg-ink-950 p-2 font-mono text-[10px] text-manifest-200/80">
        {markdown}
      </pre>
      {error ? <p className="mt-2 text-sm text-stamp-red">{error}</p> : null}
    </Panel>
  );
}
