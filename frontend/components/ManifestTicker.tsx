"use client";

import { StampBadge } from "@/components/StampBadge";

const PACKAGES = [
  { name: "lodash", ver: "4.17.21", stamp: "cleared" as const },
  { name: "express", ver: "4.21.2", stamp: "cleared" as const },
  { name: "reqeusts", ver: "2.31.0", stamp: "critical" as const },
  { name: "axios", ver: "1.7.9", stamp: "cleared" as const },
  { name: "django", ver: "5.0.1", stamp: "medium" as const },
  { name: "react", ver: "19.0.0", stamp: "cleared" as const },
  { name: "pyyaml", ver: "5.3.1", stamp: "high" as const },
  { name: "next", ver: "15.3.5", stamp: "cleared" as const },
  { name: "cryptography", ver: "44.0.0", stamp: "cleared" as const },
  { name: "left-pad", ver: "1.3.0", stamp: "low" as const },
  { name: "webpack", ver: "5.97.1", stamp: "cleared" as const },
  { name: "fastify", ver: "5.2.0", stamp: "cleared" as const },
];

/**
 * Live-looking manifest ticker for the landing hero.
 * Fake-but-realistic packages stamped CLEARED / FLAGGED.
 */
export function ManifestTicker() {
  const loop = [...PACKAGES, ...PACKAGES];

  return (
    <div className="relative overflow-hidden border-y border-manifest-200/15 bg-ink-800/70 quay-scanlines">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink-950 to-transparent" />
      <div className="quay-ticker-track flex w-max gap-8 py-4">
        {loop.map((pkg, i) => (
          <div
            key={`${pkg.name}-${i}`}
            className="flex shrink-0 items-center gap-3 font-mono text-xs text-manifest-200/90"
          >
            <span className="text-stamp-slate">▸</span>
            <span className="text-manifest-100">{pkg.name}</span>
            <span className="text-stamp-slate">@{pkg.ver}</span>
            <StampBadge severity={pkg.stamp} seed={`${pkg.name}-${i}`} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
