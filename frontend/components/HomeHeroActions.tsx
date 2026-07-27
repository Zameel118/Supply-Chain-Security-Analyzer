"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { fetchMe, getLoginUrl, type User } from "@/lib/api";

/** Single primary CTA — ops + guide live in the marketing header. */
export function HomeHeroActions() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-7 h-12 w-48 animate-pulse border border-signal-teal/20 bg-ink-800/50" />
    );
  }

  if (user) {
    return (
      <div className="mt-7">
        <Button href="/dashboard#inspect" className="!px-7 !py-3.5 !text-base">
          New inspection →
        </Button>
        <p className="mt-3 font-mono text-xs text-stamp-slate">
          Signed in as{" "}
          <span className="text-signal-cyan">{user.username}</span> · ops console in the header
        </p>
      </div>
    );
  }

  return (
    <div className="mt-7">
      <Button href={getLoginUrl()} className="!px-7 !py-3.5 !text-base">
        Sign in with GitHub
      </Button>
      <p className="mt-3 font-mono text-xs text-stamp-slate">
        Already have access?{" "}
        <Link href="/guide" className="text-signal-cyan hover:underline">
          Read the SOP guide
        </Link>{" "}
        before your first scan.
      </p>
    </div>
  );
}
