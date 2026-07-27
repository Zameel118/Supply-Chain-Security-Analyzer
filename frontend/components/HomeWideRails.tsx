"use client";

import { useEffect, useState } from "react";

const LEFT_LINES = [
  "OSV · batch ready",
  "GH API · rate OK",
  "Secrets · pattern v3",
  "License · policy map",
  "Typos · levenshtein",
  "CI · workflow AST",
  "Confusion · pkg index",
];

const RIGHT_LINES = [
  "TLS 1.3 · active",
  "Fernet · at rest",
  "Celery · in-process",
  "Postgres · findings",
  "Redis · queue",
  "CORS · locked",
  "No exec · enforced",
];

function SideRail({ title, lines }: { title: string; lines: string[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((n) => (n + 1) % lines.length), 2400);
    return () => clearInterval(id);
  }, [lines.length]);

  return (
    <aside className="hidden min-h-0 flex-col border border-signal-teal/20 bg-black/40 quay-scanlines 2xl:flex">
      <div className="border-b border-signal-teal/15 px-3 py-2">
        <p className="font-mono text-[9px] uppercase tracking-wider text-signal-cyan">{title}</p>
      </div>
      <ul className="flex flex-1 flex-col gap-1 p-3 font-mono text-[10px] text-stamp-slate">
        {lines.map((line, i) => (
          <li
            key={line}
            className={`border-l-2 py-1 pl-2 transition-colors ${
              i === idx
                ? "border-signal-cyan text-manifest-100"
                : "border-transparent opacity-60"
            }`}
          >
            {line}
          </li>
        ))}
      </ul>
      <div className="border-t border-signal-teal/15 p-3 font-mono text-[9px] text-signal-lime/80">
        node · edge-scan-01
      </div>
    </aside>
  );
}

export function HomeWideRailLeft() {
  return <SideRail title="Analyzer stack" lines={LEFT_LINES} />;
}

export function HomeWideRailRight() {
  return <SideRail title="Platform hardening" lines={RIGHT_LINES} />;
}
