import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { HeroConsole } from "@/components/HeroConsole";
import { ManifestTicker } from "@/components/ManifestTicker";
import { StampBadge } from "@/components/StampBadge";
import { getLoginUrl } from "@/lib/api";

export default function HomePage() {
  const loginUrl = getLoginUrl();

  return (
    <AppShell marketing>
      <section className="relative overflow-hidden">
        <div className="quay-grid absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-signal-teal/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 pb-6 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:pb-8 lg:pt-12">
          <div>
            <div className="inline-flex items-center gap-2 border border-signal-teal/30 bg-signal-teal/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-teal quay-pulse" />
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-signal-teal">
                Software supply chain · harbor watch
              </span>
            </div>

            <h1 className="mt-5 font-display text-4xl font-bold uppercase leading-[0.92] tracking-wide text-manifest-100 sm:text-5xl lg:text-6xl xl:text-7xl">
              Watch the quay.
              <br />
              <span className="bg-gradient-to-r from-signal-teal via-signal-teal to-stamp-amber bg-clip-text text-transparent">
                Clear the cargo.
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-manifest-200/80 sm:text-lg">
              Quaywatch runs a live dockside inspection on GitHub repos — vulns, typosquats,
              CI risks, secrets, licenses — without ever executing scanned code.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button href={loginUrl} className="!px-7 !py-3.5 !text-base">
                Sign in with GitHub
              </Button>
              <Button variant="secondary" href="/dashboard" className="!px-7 !py-3.5 !text-base">
                Enter ops console →
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 font-mono text-[11px] text-stamp-slate">
              <span className="border border-manifest-200/15 bg-ink-800/60 px-2.5 py-1">
                <span className="text-signal-teal">7</span> analyzers
              </span>
              <span className="border border-manifest-200/15 bg-ink-800/60 px-2.5 py-1">
                <span className="text-signal-teal">0</span> code executed
              </span>
              <span className="border border-manifest-200/15 bg-ink-800/60 px-2.5 py-1">
                OSV · GitHub · registries
              </span>
            </div>
          </div>

          <HeroConsole />
        </div>

        <div className="relative">
          <ManifestTicker />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-signal-teal">
              What ships with Quaywatch
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-manifest-100">
              Inspection toolkit
            </h2>
          </div>
          <p className="max-w-md font-mono text-xs text-stamp-slate">
            Every berth runs the full checkpoint belt — then stamps, diffs, and shares the report.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Checkpoint belt",
              body: "Live progress through parsing, OSV, typosquats, confusion, CI/CD, secrets, and licenses.",
              stamp: "cleared" as const,
              metric: "7 stages",
            },
            {
              title: "Manifest ledger",
              body: "Findings as stamped cargo rows — severity, remediation, and since-last-scan diffs.",
              stamp: "high" as const,
              metric: "Δ new / resolved",
            },
            {
              title: "Share & badge",
              body: "Public report links and embeddable SVG status badges for README trust signals.",
              stamp: "medium" as const,
              metric: "SVG + link",
            },
          ].map((card) => (
            <article
              key={card.title}
              className="group relative overflow-hidden border border-manifest-200/15 bg-ink-800/50 p-5 transition duration-200 hover:-translate-y-1 hover:border-signal-teal/40 hover:bg-ink-800/80 hover:shadow-[0_12px_40px_-16px_rgba(45,212,191,0.35)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-teal/50 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-3">
                <StampBadge severity={card.stamp} seed={card.title} size="sm" />
                <span className="font-mono text-[10px] text-stamp-slate">{card.metric}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-wide text-manifest-100">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-manifest-200/70">{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
