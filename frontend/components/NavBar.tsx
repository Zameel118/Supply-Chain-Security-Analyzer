"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
      <Link href="/" className="font-display text-lg font-semibold tracking-tight text-white">
        Supply Chain Security Analyzer
      </Link>

      <nav className="flex items-center gap-3 text-sm">
        {loading ? (
          <span className="text-slate-400">…</span>
        ) : user ? (
          <>
            <Link href="/dashboard" className="text-slate-300 hover:text-accent">
              Dashboard
            </Link>
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full" />
              ) : null}
              <span className="text-slate-200">{user.username}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-white/20 px-3 py-1.5 text-slate-200 hover:border-accent hover:text-accent"
            >
              Log out
            </button>
          </>
        ) : (
          <a
            href={getLoginUrl()}
            className="rounded-md bg-accent px-3 py-1.5 font-semibold text-ink hover:bg-accent-dim"
          >
            Login with GitHub
          </a>
        )}
      </nav>
    </header>
  );
}
