"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanHistory } from "@/components/ScanHistory";
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
            <p className="mt-1.5 text-xs text-slate-500">
              Commercial flags GPL/AGPL for review; open-source allows copyleft.
            </p>
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
            <p className="mt-1.5 text-xs text-slate-500">
              Used for dependency-confusion checks. Example: <code>@mycompany/</code> or{" "}
              <code>acme-</code>. Leave blank to skip.
            </p>
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
        <h2 className="font-display text-xl font-semibold text-white">Scan history</h2>
        <p className="mt-1 text-sm text-slate-400">
          Your last 50 scans with dependency and finding counts.
        </p>
        <ScanHistory scans={history} />
      </section>
    </div>
  );
}
