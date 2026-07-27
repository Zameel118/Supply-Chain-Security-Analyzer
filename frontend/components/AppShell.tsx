"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { QuayLogo } from "@/components/QuayLogo";
import {
  fetchActivity,
  fetchMe,
  fetchScans,
  getLoginUrl,
  logout,
  type ActivityEvent,
  type Scan,
  type User,
} from "@/lib/api";
import { getAppVersion } from "@/lib/version";

function IconOps({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconInspect({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconManifest({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4h10a2 2 0 012 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconLive({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <path
        d="M7.5 7.5a6.5 6.5 0 000 9M16.5 7.5a6.5 6.5 0 010 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M4.5 4.5a10.5 10.5 0 000 15M19.5 4.5a10.5 10.5 0 010 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

const NAV: {
  href: string;
  label: string;
  hint: string;
  key: "ops" | "inspect" | "manifest" | "live";
  icon: (p: { className?: string }) => ReactNode;
}[] = [
  { href: "/dashboard", label: "Ops", hint: "Board", key: "ops", icon: IconOps },
  {
    href: "/dashboard#inspect",
    label: "Inspect",
    hint: "New scan",
    key: "inspect",
    icon: IconInspect,
  },
  {
    href: "/dashboard#history",
    label: "Manifest",
    hint: "History",
    key: "manifest",
    icon: IconManifest,
  },
  { href: "/dashboard#feed", label: "Live", hint: "Feed", key: "live", icon: IconLive },
];

type Props = {
  children: React.ReactNode;
  marketing?: boolean;
  onOpenTour?: () => void;
};

export function AppShell({ children, marketing = false, onOpenTour }: Props) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [railOpen, setRailOpen] = useState(true);
  const [scans, setScans] = useState<Scan[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [clock, setClock] = useState("");

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (marketing || !user) return;
    let cancelled = false;

    async function refresh() {
      try {
        const [s, a] = await Promise.all([fetchScans(), fetchActivity()]);
        if (!cancelled) {
          setScans(s);
          setActivity(a);
        }
      } catch {
        /* ignore */
      }
    }

    refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [marketing, user]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function onLogout() {
    await logout();
    setUser(null);
    window.location.href = "/";
  }

  const running = scans.filter((s) => s.status === "running" || s.status === "queued").length;
  const cleared = scans.filter((s) => s.status === "complete").length;
  const liveCount = activity.length;

  if (marketing) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-manifest-200/10 bg-ink-950/80 backdrop-blur-md">
          <div className="mx-auto flex w-full items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
            <Link href="/">
              <QuayLogo />
            </Link>
            <nav className="flex items-center gap-3">
              <Link
                href="/guide"
                className="hidden font-mono text-[11px] uppercase tracking-wider text-stamp-slate hover:text-signal-teal sm:block"
              >
                User guide
              </Link>
              {loading ? (
                <span className="font-mono text-xs text-stamp-slate">…</span>
              ) : user ? (
                <>
                  <span className="hidden items-center gap-1.5 font-mono text-[10px] text-stamp-slate sm:flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-signal-teal quay-pulse" />
                    {user.username} · online
                  </span>
                  <Button href="/dashboard" className="!py-2">
                    Open ops
                  </Button>
                  <Button variant="secondary" type="button" onClick={onLogout} className="!py-2">
                    Log out
                  </Button>
                </>
              ) : (
                <Button href={getLoginUrl()}>Sign in with GitHub</Button>
              )}
            </nav>
          </div>
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={`sticky top-0 z-20 flex h-screen flex-col overflow-hidden border-r border-manifest-200/10 bg-gradient-to-b from-ink-800 to-ink-950 transition-[width] duration-200 ${
          railOpen ? "w-56 px-3" : "w-16 px-2"
        }`}
      >
        <div
          className={`flex items-center py-4 ${railOpen ? "justify-between gap-2" : "flex-col gap-3"}`}
        >
          <Link href="/" className="flex shrink-0 justify-center overflow-hidden" data-tour="brand">
            <QuayLogo showWordmark={railOpen} size={26} />
          </Link>
          <button
            type="button"
            aria-label={railOpen ? "Collapse nav" : "Expand nav"}
            onClick={() => setRailOpen((v) => !v)}
            className="shrink-0 rounded-sm border border-manifest-200/15 px-1.5 py-0.5 font-mono text-xs text-stamp-slate hover:border-signal-teal hover:text-signal-teal"
          >
            {railOpen ? "«" : "»"}
          </button>
        </div>

        {railOpen ? (
          <div
            className="mb-3 border border-signal-teal/20 bg-ink-950/70 px-2.5 py-2 quay-scanlines"
            data-tour="channel"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-signal-teal">
                Channel live
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-signal-teal quay-pulse" />
            </div>
            <p className="mt-1 font-mono text-[10px] tabular-nums text-manifest-200/70">{clock}</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="bg-ink-800/80 px-1.5 py-1">
                <p className="font-mono text-[8px] text-stamp-slate">ACTIVE</p>
                <p className="font-mono text-sm tabular-nums text-stamp-amber">{running}</p>
              </div>
              <div className="bg-ink-800/80 px-1.5 py-1">
                <p className="font-mono text-[8px] text-stamp-slate">CLEARED</p>
                <p className="font-mono text-sm tabular-nums text-signal-teal">{cleared}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-2 flex flex-col items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-signal-teal quay-pulse" />
            <span className="font-mono text-[9px] tabular-nums text-stamp-amber">{running}</span>
          </div>
        )}

        <nav className="mt-1 flex flex-1 flex-col gap-1 overflow-hidden">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href.split("#")[0] || item.href);
            const Icon = item.icon;
            const badge =
              item.key === "live"
                ? liveCount
                : item.key === "manifest"
                  ? scans.length
                  : item.key === "ops"
                    ? running
                    : 0;
            const isLive = item.key === "live";

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`group relative flex items-center rounded-sm transition ${
                  railOpen ? "gap-2.5 px-2.5 py-2.5" : "justify-center px-0 py-2.5"
                } ${
                  active
                    ? `bg-signal-teal/15 text-signal-teal ${isLive ? "quay-nav-live" : ""}`
                    : "text-manifest-200/75 hover:bg-ink-800 hover:text-manifest-100"
                }`}
              >
                {active ? (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-signal-teal" />
                ) : null}
                <span className="relative">
                  <Icon className="h-5 w-5 shrink-0" />
                  {!railOpen && badge > 0 ? (
                    <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-stamp-red px-0.5 font-mono text-[8px] text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                {railOpen ? (
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs font-bold uppercase tracking-wide">
                        {item.label}
                      </span>
                      {badge > 0 ? (
                        <span
                          className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] tabular-nums ${
                            isLive
                              ? "bg-signal-teal/20 text-signal-teal"
                              : "bg-ink-950 text-stamp-slate"
                          }`}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="block font-mono text-[10px] text-stamp-slate">{item.hint}</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {railOpen && activity[0] ? (
          <div className="mb-3 border border-manifest-200/10 bg-ink-950/60 px-2.5 py-2">
            <p className="font-mono text-[8px] uppercase tracking-wider text-stamp-slate">
              Last signal
            </p>
            <p className="mt-1 line-clamp-2 font-mono text-[10px] leading-snug text-manifest-200/80">
              {activity[0].message}
            </p>
          </div>
        ) : null}

        <div className="shrink-0 border-t border-manifest-200/10 py-4">
          {user ? (
            <div className={`flex items-center gap-2 ${railOpen ? "" : "justify-center"}`}>
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full ring-2 ring-signal-teal/50"
                />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-[10px] text-signal-teal ring-2 ring-signal-teal/40">
                  {(user.username[0] || "?").toUpperCase()}
                </span>
              )}
              {railOpen ? (
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-manifest-100">{user.username}</p>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="font-sans text-[11px] text-stamp-slate hover:text-stamp-red"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Button href={getLoginUrl()} className="w-full !px-2" title="Sign in">
              {railOpen ? "Sign in" : "→"}
            </Button>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-manifest-200/10 bg-ink-800/50 px-4 py-2 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-stamp-slate">
            Quaywatch · inspection console ·{" "}
            <span className="text-signal-teal quay-board-live">live</span>
            <span className="ml-2 text-[10px] normal-case text-stamp-slate/80">
              v{getAppVersion()}
            </span>
          </p>
          <div className="flex items-center gap-3">
            {onOpenTour ? (
              <button
                type="button"
                data-tour="help"
                onClick={onOpenTour}
                className="font-mono text-[10px] uppercase tracking-wider text-stamp-slate hover:text-signal-teal"
              >
                Tour (?)
              </button>
            ) : null}
            <Link
              href="/guide"
              className="font-mono text-[10px] uppercase tracking-wider text-stamp-slate hover:text-signal-teal"
            >
              SOP guide
            </Link>
            <p className="hidden font-mono text-[10px] tabular-nums text-stamp-slate sm:block">
              {clock}
            </p>
          </div>
        </div>
        <main className="px-4 py-5 sm:px-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
