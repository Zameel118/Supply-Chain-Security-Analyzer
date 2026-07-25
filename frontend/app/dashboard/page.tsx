"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanForm } from "@/components/ScanForm";
import { fetchMe, getLoginUrl, type User } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then((u) => {
        if (!u) {
          window.location.href = getLoginUrl();
          return;
        }
        setUser(u);
      })
      .catch(() => {
        window.location.href = getLoginUrl();
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-slate-400">Checking session…</main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.18em] text-accent">Dashboard</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">
        Scan a repository
      </h1>
      <p className="mt-3 max-w-2xl text-slate-300">
        Paste a public GitHub URL or pick one of your repos. We queue a background job
        and you can watch the status update live.
      </p>
      <div className="mt-8">
        <ScanForm />
      </div>
    </main>
  );
}
