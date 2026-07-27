"use client";

import { useEffect, useState } from "react";

function randomHex(bytes: number) {
  const chars = "0123456789ABCDEF";
  let out = "";
  for (let i = 0; i < bytes * 2; i += 1) {
    out += chars[Math.floor(Math.random() * 16)];
  }
  return out;
}

/** Bottom status strip on home hero — session / node / hex drift. */
export function HomeTerminalHud() {
  const [session] = useState(() => `QW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
  const [hex, setHex] = useState("A4F2…");
  const [load, setLoad] = useState(12);

  useEffect(() => {
    const id = setInterval(() => {
      setHex(`${randomHex(4)}…${randomHex(2)}`);
      setLoad((n) => 8 + Math.floor(Math.random() * 28));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="mt-5 border border-signal-teal/25 bg-ink-900/90 px-3 py-2.5 font-mono text-[10px] sm:px-4"
      aria-hidden="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-stamp-slate">
          <span>
            SESSION <span className="text-signal-cyan">{session}</span>
          </span>
          <span>
            NODE <span className="text-manifest-100">edge-scan-01</span>
          </span>
          <span>
            MODE <span className="text-signal-lime">PASSIVE</span>
          </span>
          <span>
            LOAD <span className="tabular-nums text-stamp-amber">{load}%</span>
          </span>
        </div>
        <span className="quay-live-pill">Secure channel</span>
      </div>
      <p className="quay-matrix-line quay-hex-drift mt-2 border-t border-manifest-200/10 pt-2">
        0x{hex} · sha256:verified · tls1.3 · no code execution · ingest:github-api
      </p>
    </div>
  );
}
