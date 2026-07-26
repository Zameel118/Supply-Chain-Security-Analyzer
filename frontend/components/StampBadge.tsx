"use client";

import type { ReactNode } from "react";

export type StampSeverity = "critical" | "high" | "medium" | "low" | "info" | "cleared";

const STAMP_LABEL: Record<StampSeverity, string> = {
  critical: "CRITICAL · HOLD",
  high: "FLAGGED · HIGH",
  medium: "FLAGGED · MEDIUM",
  low: "NOTED · LOW",
  info: "NOTED · INFO",
  cleared: "CLEARED",
};

const STAMP_COLOR: Record<StampSeverity, string> = {
  critical: "#E14B4B",
  high: "#E14B4B",
  medium: "#F0A93F",
  low: "#7C8CA6",
  info: "#7C8CA6",
  cleared: "#2DD4BF",
};

/** Deterministic rotation from an id string, in the range −4deg … 3deg. */
export function stampRotation(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const unit = Math.abs(hash % 1000) / 1000;
  return -4 + unit * 7;
}

type Props = {
  severity: StampSeverity;
  /** Stable seed for rotation (finding id, scan id, etc.) */
  seed: string;
  size?: "sm" | "md";
  className?: string;
  children?: ReactNode;
};

export function StampBadge({
  severity,
  seed,
  size = "md",
  className = "",
  children,
}: Props) {
  const color = STAMP_COLOR[severity];
  const label = children ?? STAMP_LABEL[severity];
  const rotation = stampRotation(seed);
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`stamp-badge relative inline-flex items-center justify-center font-display font-bold uppercase tracking-wide ${pad} ${className}`}
      style={{
        color,
        border: `1.75px solid ${color}`,
        backgroundColor: `${color}14`,
        transform: `rotate(${rotation.toFixed(2)}deg)`,
      }}
      title={typeof label === "string" ? label : undefined}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 20% 30%, rgba(0,0,0,0.18) 0 0.5px, transparent 0.6px 2px)",
          mixBlendMode: "multiply",
        }}
      />
      <span className="relative z-[1]">{label}</span>
    </span>
  );
}

export function severityToStamp(severity: string): StampSeverity {
  const key = severity.toLowerCase();
  if (key === "critical" || key === "high" || key === "medium" || key === "low") {
    return key;
  }
  if (key === "cleared") return "cleared";
  return "info";
}
