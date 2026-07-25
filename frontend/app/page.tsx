import Link from "next/link";
import { getApiUrl, getLoginUrl } from "@/lib/api";

/**
 * Landing page — brand-first hero. Login + dashboard come after auth.
 */
export default function HomePage() {
  const loginUrl = getLoginUrl();
  const docsUrl = getApiUrl("/docs");

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center px-6 py-12">
      <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-accent">
        Phase 1 · GitHub OAuth
      </p>

      <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
        Supply Chain
        <br />
        Security Analyzer
      </h1>

      <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
        Sign in with GitHub, submit a repository, and get a security report covering
        dependency vulnerabilities, typosquatting, dependency confusion, CI/CD risks,
        secret leaks, and license compliance.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a
          href={loginUrl}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-accent-dim"
        >
          Login with GitHub
        </a>
        <Link
          href="/dashboard"
          className="rounded-md border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-accent hover:text-accent"
        >
          Open dashboard
        </Link>
        <a
          href={docsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-slate-400 underline-offset-4 hover:text-accent hover:underline"
        >
          API docs
        </a>
      </div>
    </main>
  );
}
