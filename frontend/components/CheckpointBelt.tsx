"use client";

const PHASES = [
  { id: "parsing", label: "Parsing" },
  { id: "vulnerabilities", label: "Vulns" },
  { id: "typosquats", label: "Typos" },
  { id: "dep_confusion", label: "Confusion" },
  { id: "cicd", label: "CI/CD" },
  { id: "secrets", label: "Secrets" },
  { id: "licenses", label: "Licenses" },
] as const;

type Props = {
  status: string;
  currentPhase: string | null | undefined;
};

export function CheckpointBelt({ status, currentPhase }: Props) {
  const phase = currentPhase || (status === "queued" ? "queued" : null);
  const activeIdx = PHASES.findIndex((p) => p.id === phase);
  const done =
    status === "complete" || phase === "complete"
      ? PHASES.length
      : status === "failed"
        ? Math.max(activeIdx, 0)
        : activeIdx;

  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-[640px] items-center gap-0">
        {PHASES.map((p, i) => {
          const complete = status === "complete" || i < done;
          const active = status === "running" && i === activeIdx;
          return (
            <li key={p.id} className="flex flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1.5">
                <span
                  className={`h-3 w-3 rounded-full border-2 transition ${
                    complete
                      ? "border-signal-teal bg-signal-teal"
                      : active
                        ? "border-signal-teal bg-signal-teal/30 quay-pulse"
                        : "border-stamp-slate/50 bg-transparent"
                  }`}
                />
                <span
                  className={`font-display text-[10px] font-bold uppercase tracking-wide ${
                    complete || active ? "text-signal-teal" : "text-stamp-slate"
                  }`}
                >
                  {p.label}
                </span>
              </div>
              {i < PHASES.length - 1 ? (
                <div
                  className={`mx-1 h-0.5 flex-1 ${
                    complete ? "bg-signal-teal" : "bg-stamp-slate/25"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 font-mono text-[11px] text-stamp-slate">
        Checkpoint belt ·{" "}
        {status === "complete"
          ? "all clear"
          : status === "failed"
            ? "hold: inspection failed"
            : `active: ${phase ?? "queued"}`}
      </p>
    </div>
  );
}
