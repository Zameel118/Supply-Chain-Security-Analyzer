import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { getLoginUrl } from "@/lib/api";

export const metadata = {
  title: "User guide",
  description:
    "Standard operating procedure for using Quaywatch to inspect and harden GitHub repositories.",
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border border-manifest-200/10 bg-ink-800/40 p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold uppercase tracking-wide text-manifest-100 sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-manifest-200/85">{children}</div>
    </section>
  );
}

function Fig({
  src,
  alt,
  caption,
  width,
  height,
}: {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}) {
  return (
    <figure className="my-6 overflow-hidden border border-manifest-200/15 bg-ink-950">
      <Image src={src} alt={alt} width={width} height={height} className="h-auto w-full" />
      <figcaption className="border-t border-manifest-200/10 px-4 py-2 font-mono text-[11px] text-stamp-slate">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function UserGuidePage() {
  const login = getLoginUrl();

  return (
    <AppShell marketing>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-signal-teal">
          Standard operating procedure
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-manifest-100 sm:text-4xl">
          How to use Quaywatch
        </h1>
        <p className="mt-4 max-w-2xl text-base text-manifest-200/80">
          This guide explains every major screen, what each option does, and how to use scan results
          to harden your GitHub repositories. No code runs on Quaywatch servers — only static
          analysis via the GitHub Contents API.
        </p>

        <nav className="mt-8 flex flex-wrap gap-2 font-mono text-[11px]">
          {[
            ["#start", "Get started"],
            ["#home", "Home page"],
            ["#ops", "Ops console"],
            ["#scan", "Run a scan"],
            ["#report", "Read results"],
            ["#harden", "Strengthen repos"],
            ["#share", "Share & badge"],
            ["#tour", "Tour vs this guide"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="border border-manifest-200/20 px-2.5 py-1 text-stamp-slate hover:border-signal-teal hover:text-signal-teal"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-8">
          <Section id="start" title="1. Get started">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open the app and click <strong>Sign in with GitHub</strong>. Approve access for{" "}
                <code className="font-mono text-signal-cyan">read:user</code> and{" "}
                <code className="font-mono text-signal-cyan">public_repo</code> (public repos).
              </li>
              <li>
                For <strong>private repositories</strong>, sign in again using the private scope link
                on the scan form (requests broader <code className="font-mono">repo</code> access).
              </li>
              <li>
                After login you land on the <strong>Ops console</strong> (`/dashboard`). Press{" "}
                <kbd className="rounded border border-manifest-200/30 px-1">?</kbd> anytime for the
                interactive tour.
              </li>
            </ol>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button href={login}>Sign in with GitHub</Button>
              <Button variant="secondary" href="/dashboard">
                Open ops console
              </Button>
            </div>
          </Section>

          <Section id="home" title="2. Home page (before login)">
            <p>
              The landing page demonstrates what a scan feels like. The center{" "}
              <strong>Live berth · demo</strong> panel and right <strong>Live action</strong> rail are
              simulated — they show checkpoint progress and sample findings, not your repos.
            </p>
            <Fig
              src="/guide/01-home-hero.png"
              alt="Quaywatch home page with live demo panels"
              caption="Figure 1 — Home hero: headline, Live berth demo (center), Live action rail (right)."
              width={1400}
              height={720}
            />
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Sign in with GitHub</strong> — starts OAuth and opens the real dashboard.
              </li>
              <li>
                <strong>Enter ops console</strong> — redirects to dashboard (login required).
              </li>
              <li>
                <strong>Live action stream</strong> (below the fold) — demo traffic only; labeled
                “Global berth traffic”.
              </li>
            </ul>
          </Section>

          <Section id="ops" title="3. Ops console (dashboard)">
            <p>After login, the left rail is your main navigation:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Ops</strong> — status board (queued / running / complete counts) and quick
                overview.
              </li>
              <li>
                <strong>Inspect</strong> — scroll to the scan form: paste a GitHub repo URL and start
                an inspection.
              </li>
              <li>
                <strong>Manifest</strong> — scan history for your account (recent berths).
              </li>
              <li>
                <strong>Live</strong> — real <strong>Live action feed</strong> of your scan events
                (updates every few seconds). Look for the cyan <span className="quay-live-pill">Live</span>{" "}
                badge.
              </li>
            </ul>
            <p>
              <strong>Channel live</strong> (top of rail) shows clock, ACTIVE scans, and CLEARED
              count. <strong>Watchlist</strong> pins repos you care about (stored in your browser).
            </p>
          </Section>

          <Section id="scan" title="4. Run a scan">
            <p>In the inspect panel, submit:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Repository URL</strong> — e.g. `https://github.com/org/repo` (public or
                private if you authorized private scope).
              </li>
              <li>
                <strong>Project type</strong> — <em>Commercial</em> flags GPL/AGPL for license review;{" "}
                <em>Open source</em> relaxes some license holds.
              </li>
              <li>
                <strong>Private package prefix</strong> (optional) — e.g. `@mycompany/` for
                dependency-confusion checks against public registries.
              </li>
            </ul>
            <Image
              src="/guide/02-checkpoint-belt.svg"
              alt="Seven checkpoint stages diagram"
              width={920}
              height={120}
              className="my-6 w-full border border-manifest-200/15 bg-ink-950"
            />
            <p className="font-mono text-[11px] text-stamp-slate">
              Figure 2 — Every scan runs all seven checkpoints in order.
            </p>
            <p>
              While running, open the scan detail page to watch the <strong>checkpoint belt</strong>{" "}
              advance: Parsing → Vulnerabilities → Typosquats → Dep confusion → CI/CD → Secrets →
              Licenses.
            </p>
          </Section>

          <Section id="report" title="5. Read scan results">
            <p>On the scan detail page you will see:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Summary cards</strong> — dependency count and findings by category.
              </li>
              <li>
                <strong>Stamp badges</strong> — severity at a glance (CLEARED, FLAGGED, CRITICAL HOLD).
              </li>
              <li>
                <strong>Manifest ledger</strong> — table of findings with remediation text; filter by
                type/severity.
              </li>
              <li>
                <strong>Dependency graph</strong> — packages as nodes; risky deps highlighted.
              </li>
              <li>
                <strong>Since last scan</strong> — +new and resolved findings vs your previous scan of
                the same repo.
              </li>
              <li>
                <strong>Export</strong> — download JSON or PDF for records or tickets.
              </li>
            </ul>
            <p>
              <strong>Finding types:</strong> vulnerability (OSV), typosquat, dep_confusion, cicd
              (workflow risks), secret (masked patterns), license (policy).
            </p>
          </Section>

          <Section id="harden" title="6. Use Quaywatch to strengthen GitHub projects">
            <p>Recommended workflow for teams and solo maintainers:</p>
            <ol className="list-decimal space-y-3 pl-5">
              <li>
                <strong>Baseline</strong> — scan `main` after every major dependency bump. Save the
                PDF export as a release artifact.
              </li>
              <li>
                <strong>Fix critical/high first</strong> — OSV findings with upgrades or pins;
                typosquats and confusion hits before adding new deps.
              </li>
              <li>
                <strong>CI/CD hygiene</strong> — pin GitHub Actions to full SHAs; remove{" "}
                <code className="font-mono">curl | bash</code> patterns Quaywatch flags.
              </li>
              <li>
                <strong>Secrets</strong> — rotate anything flagged (tokens in repo history need
                revocation + git history cleanup).
              </li>
              <li>
                <strong>Licenses</strong> — resolve GPL/AGPL holds before shipping commercial
                products.
              </li>
              <li>
                <strong>Regression watch</strong> — re-scan weekly; use “since last scan” to catch new
                vulns when lockfiles change.
              </li>
              <li>
                <strong>README trust</strong> — embed the SVG status badge on repos you want
                contributors to trust.
              </li>
            </ol>
          </Section>

          <Section id="share" title="7. Public share link & badge">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Make report public</strong> — generates a read-only link (`/report/…`) without
                login. Revoke anytime.
              </li>
              <li>
                <strong>Badge SVG</strong> — embed in README; shows cleared vs flagged counts. Link
                back to your report or app.
              </li>
            </ul>
            <p className="text-stamp-slate">
              Do not share public links for repos with sensitive unreleased details unless you accept
              that anyone with the URL can read the report.
            </p>
          </Section>

          <Section id="tour" title="8. Tour vs this guide">
            <p>
              The <strong>tour (?)</strong> highlights UI regions on first visit. This SOP explains{" "}
              <em>why</em> each area exists and how to act on findings. Bookmark{" "}
              <Link href="/guide" className="text-signal-teal underline">
                /guide
              </Link>{" "}
              or share it with teammates.
            </p>
            <p>
              Full markdown copy for offline use:{" "}
              <code className="font-mono text-xs">docs/QUAYWATCH_USER_SOP.md</code> in the GitHub
              repository.
            </p>
          </Section>
        </div>

        <p className="mt-12 text-center font-mono text-[11px] text-stamp-slate">
          Questions? Re-run a scan after fixes and compare the “since last scan” diff.
        </p>
      </div>
    </AppShell>
  );
}
