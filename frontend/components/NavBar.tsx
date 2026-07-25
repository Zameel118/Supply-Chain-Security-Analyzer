"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { fetchMe, getLoginUrl, logout, type User } from "@/lib/api";

export function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function onLogout() {
    await logout();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between border-b border-manifest-200/10 px-6 py-5">
      <Link
        href="/"
        className="font-display text-sm font-bold uppercase tracking-wide text-manifest-100 hover:text-signal-teal"
      >
        Supply Chain Security Analyzer
      </Link>

      <nav className="flex items-center gap-3 text-sm">
        {loading ? (
          <span className="font-mono text-stamp-slate">…</span>
        ) : user ? (
          <>
            <Link
              href="/dashboard"
              className="font-sans text-manifest-200/80 hover:text-signal-teal"
            >
              Dashboard
            </Link>
            <div className="flex items-center gap-2 border border-manifest-200/15 bg-ink-800 px-2 py-1">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full" />
              ) : null}
              <span className="font-mono text-xs text-manifest-100">{user.username}</span>
            </div>
            <Button variant="secondary" type="button" onClick={onLogout} className="!px-3 !py-1.5">
              Log out
            </Button>
          </>
        ) : (
          <Button href={getLoginUrl()}>Login with GitHub</Button>
        )}
      </nav>
    </header>
  );
}
