import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { HeroConsole } from "@/components/HeroConsole";
import { HeroSignalRail } from "@/components/HeroSignalRail";
import { HomeLiveStream } from "@/components/HomeLiveStream";
import { HomeMatrixStats } from "@/components/HomeMatrixStats";
import { HomeTerminalHud } from "@/components/HomeTerminalHud";
import { ManifestTicker } from "@/components/ManifestTicker";
import { StampBadge } from "@/components/StampBadge";
import { getLoginUrl } from "@/lib/api";

export default function HomePage() {
  const loginUrl = getLoginUrl();

  return (
    <AppShell marketing>
      <section className="relative w-full px-4 pb-8 pt-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="quay-command-deck quay-terminal-chrome relative overflow-hidden rounded-sm p-4 sm:p-6 lg:p-8">
          <div className="quay-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-signal-teal/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-signal-cyan/8 blur-3xl" />

          <div className="relative mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-signal-teal/20 pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stamp-slate">
              Quaywatch · intrusion surface mapper
            </p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-signal-lime quay-pulse" />
              <span className="quay-live-pill">Live ops</span>
            </div>
          </div>

          <div className="relative grid items-stretch gap-5 xl:grid-cols-12 xl:gap-6">
            <div className="flex flex-col justify-center xl:col-span-4">
              <div className="inline-flex w-fit items-center gap-2 border border-signal-cyan/35 bg-ink-800/80 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-signal-cyan quay-pulse" />
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-signal-cyan">
                  Supply chain · black-box scan
                </span>
              </div>

              <h1 className="mt-5 font-display text-4xl font-bold uppercase leading-[0.92] tracking-wide text-manifest-100 sm:text-5xl lg:text-[3.25rem] xl:text-6xl">
                Watch the quay.
                <br />
                <span className="bg-gradient-to-r from-manifest-100 via-signal-cyan to-signal-teal bg-clip-text text-transparent">
                  Clear the cargo.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-manifest-200/85 sm:text-lg">
                Terminal-grade inspection for GitHub: OSV sweeps, typosquats, CI drift, secret
                patterns, license holds. Static analysis only — zero code execution on our side.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button href={loginUrl} className="!px-7 !py-3.5 !text-base">
                  Sign in with GitHub
                </Button>
                <Button variant="secondary" href="#live-arsenal" className="!px-7 !py-3.5 !text-base">
                  View live arsenal
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] text-stamp-slate">
                <span className="border border-signal-teal/25 bg-black/40 px-2.5 py-1">
                  <span className="text-signal-cyan">7</span> analyzers
                </span>
                <span className="border border-signal-teal/25 bg-black/40 px-2.5 py-1">
                  <span className="text-signal-lime">0</span> code executed
                </span>
                <span className="border border-signal-teal/25 bg-black/40 px-2.5 py-1">
                  OSV · GH API · registries
                </span>
              </div>

              <div className="mt-5 hidden sm:block">
                <HomeMatrixStats />
              </div>
            </div>

            <div className="xl:col-span-5">
              <HeroConsole />
            </div>

            <div className="flex min-h-[34rem] xl:col-span-3">
              <HeroSignalRail />
            </div>
          </div>

          <HomeTerminalHud />

          <div className="relative -mx-4 mt-5 sm:-mx-6 lg:-mx-8">
            <ManifestTicker />
          </div>
        </div>

        <div className="mt-5 sm:hidden">
          <HomeMatrixStats />
        </div>
      </section>

      <HomeLiveStream />

      <section className="w-full px-4 pb-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="grid gap-px border border-signal-teal/20 bg-signal-teal/15 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Parse", v: "Manifests", d: "Lockfiles via Contents API" },
            { k: "Sweep", v: "OSV + typos", d: "Vulns and lookalike names" },
            { k: "Pipe", v: "CI · secrets", d: "Workflows and token leaks" },
            { k: "Stamp", v: "Policy", d: "License holds by project type" },
          ].map((s) => (
            <div
              key={s.k}
              className="bg-ink-900/95 px-4 py-4 transition hover:bg-ink-800/90"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-signal-cyan">{s.k}</p>
              <p className="mt-1 font-display text-sm font-bold uppercase tracking-wide text-manifest-100">
                {s.v}
              </p>
              <p className="mt-1 font-mono text-[11px] text-stamp-slate">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="live-arsenal" className="w-full px-4 pb-12 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-signal-cyan">
              Arsenal
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-manifest-100">
              Inspection toolkit
            </h2>
          </div>
          <p className="max-w-xl font-mono text-xs text-stamp-slate">
            Every berth runs the full checkpoint belt, then stamps, diffs, and shares the report.
          </p>
        </div>

        <div className="grid gap-px border border-signal-teal/20 bg-signal-teal/15 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Checkpoint belt",
              body: "Live progress through parsing, OSV, typosquats, confusion, CI/CD, secrets, and licenses.",
              stamp: "cleared" as const,
              metric: "7 stages",
            },
            {
              title: "Manifest ledger",
              body: "Findings as stamped cargo rows: severity, remediation, and since-last-scan diffs.",
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
              className="group relative bg-ink-900/95 p-5 transition duration-200 hover:bg-ink-800/95"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-cyan/50 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-3">
                <StampBadge severity={card.stamp} seed={card.title} size="sm" />
                <span className="font-mono text-[10px] text-stamp-slate">{card.metric}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-wide text-manifest-100">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-manifest-200/75">{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
