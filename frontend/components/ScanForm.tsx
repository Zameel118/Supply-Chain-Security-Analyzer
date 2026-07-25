"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createScan,
  fetchRepos,
  fetchScans,
  type Repo,
  type Scan,
} from "@/lib/api";

export function ScanForm() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [projectType, setProjectType] = useState("commercial");
  const [prefix, setPrefix] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [history, setHistory] = useState<Scan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(true);

  useEffect(() => {
    Promise.all([fetchRepos(), fetchScans()])
      .then(([r, s]) => {
        setRepos(r);
        setHistory(s);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingRepos(false));
  }, []);

  const repoOptions = useMemo(
    () =>
      repos.map((r) => ({
        value: r.html_url,
        label: `${r.full_name}${r.private ? " (private)" : ""}`,
      })),
    [repos],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const scan = await createScan({
        repo_url: repoUrl.trim(),
        project_type: projectType,
        private_package_prefix: prefix.trim() || undefined,
      });
      router.push(`/scans/${scan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="repo-url">
            GitHub repository URL
          </label>
          <input
            id="repo-url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            required
            className="w-full rounded-md border border-white/15 bg-ink/60 px-3 py-2.5 text-white outline-none ring-accent focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="repo-pick">
            Or pick one of your repos
          </label>
          <select
            id="repo-pick"
            disabled={loadingRepos}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) setRepoUrl(e.target.value);
            }}
            className="w-full rounded-md border border-white/15 bg-ink/60 px-3 py-2.5 text-white outline-none ring-accent focus:ring-2"
          >
            <option value="">
              {loadingRepos ? "Loading your repositories…" : "Select a repository"}
            </option>
            {repoOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="project-type">
              Project type
            </label>
            <select
              id="project-type"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full rounded-md border border-white/15 bg-ink/60 px-3 py-2.5 text-white outline-none ring-accent focus:ring-2"
            >
              <option value="commercial">Commercial</option>
              <option value="open-source">Open source</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="prefix">
              Private package prefix (optional)
            </label>
            <input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="@mycompany/"
              className="w-full rounded-md border border-white/15 bg-ink/60 px-3 py-2.5 text-white outline-none ring-accent focus:ring-2"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !repoUrl.trim()}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Starting scan…" : "Start scan"}
        </button>
      </form>

      <section>
        <h2 className="font-display text-xl font-semibold text-white">Recent scans</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No scans yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {history.map((scan) => (
              <li key={scan.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <a href={`/scans/${scan.id}`} className="truncate text-slate-200 hover:text-accent">
                  {scan.repo_url}
                </a>
                <StatusPill status={scan.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: Scan["status"] }) {
  const colors: Record<Scan["status"], string> = {
    queued: "border-slate-400/40 text-slate-300",
    running: "border-amber-400/50 text-amber-200",
    complete: "border-accent/50 text-accent",
    failed: "border-danger/50 text-red-300",
  };
  return (
    <span className={`shrink-0 rounded border px-2 py-0.5 text-xs uppercase tracking-wide ${colors[status]}`}>
      {status}
    </span>
  );
}
