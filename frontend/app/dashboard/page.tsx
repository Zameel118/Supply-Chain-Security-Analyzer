"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import {
  AnalyzerCoverage,
  RiskPulse,
  WatchlistPanel,
} from "@/components/DashboardExtras";
import { LiveFeed } from "@/components/LiveFeed";
import { ScanForm } from "@/components/ScanForm";
import { StatusBoard } from "@/components/StatusBoard";
import { TourGuide, shouldAutoShowTour } from "@/components/TourGuide";
import { fetchMe, fetchScans, getLoginUrl, type Scan, type User } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((u) => {
        if (!u) {
          window.location.href = getLoginUrl();
          return;
        }
        setUser(u);
        return fetchScans().then(setScans);
      })
      .catch(() => {
        window.location.href = getLoginUrl();
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!user || loading) return;
    if (shouldAutoShowTour()) {
      const t = setTimeout(() => setTourOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => {
      fetchScans()
        .then(setScans)
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setTourOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) {
    return (
      <AppShell>
        <p className="font-mono text-stamp-slate">Checking session…</p>
      </AppShell>
    );
  }

  if (!user) return null;

  const latest = scans[0];
  const running = scans.filter((s) => s.status === "running" || s.status === "queued");

  return (
    <AppShell onOpenTour={() => setTourOpen(true)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-signal-teal">
            Ops console · channel open
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-manifest-100 sm:text-3xl">
            Welcome aboard,{" "}
            <span className="font-mono normal-case tracking-normal text-signal-teal">
              {user.username}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            type="button"
            className="!py-2 !text-xs"
            data-tour="help"
            onClick={() => setTourOpen(true)}
          >
            Tour (?)
          </Button>
          <Button href="#inspect" className="!py-2 !text-xs">
            + New inspection
          </Button>
          {latest ? (
            <Button variant="secondary" href={`/scans/${latest.id}`} className="!py-2 !text-xs">
              Latest berth →
            </Button>
          ) : null}
        </div>
      </div>

      {running.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 border border-stamp-amber/30 bg-stamp-amber/10 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-stamp-amber quay-pulse" />
          <p className="font-mono text-xs text-stamp-amber">
            {running.length} inspection{running.length === 1 ? "" : "s"} on the belt
          </p>
          {running.slice(0, 2).map((s) => (
            <Link
              key={s.id}
              href={`/scans/${s.id}`}
              className="font-mono text-[11px] text-manifest-100 underline-offset-2 hover:text-signal-teal hover:underline"
            >
              {s.repo_url.replace(/^https:\/\/github\.com\//i, "")}
              {s.current_phase ? ` · ${s.current_phase}` : ""}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mb-5" data-tour="board">
        <StatusBoard scans={scans} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <RiskPulse scans={scans} />
        <WatchlistPanel scans={scans} />
        <AnalyzerCoverage scans={scans} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div data-tour="inspect">
          <ScanForm />
        </div>
        <aside className="xl:sticky xl:top-4">
          <LiveFeed />
        </aside>
      </div>

      <TourGuide open={tourOpen} onClose={() => setTourOpen(false)} />
    </AppShell>
  );
}
