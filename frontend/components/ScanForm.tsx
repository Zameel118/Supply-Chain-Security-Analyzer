"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { ScanHistory } from "@/components/ScanHistory";
import {
  createScan,
  fetchRepos,
  fetchScans,
  getLoginUrl,
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

  const inputClass =
    "w-full border border-manifest-200/20 bg-ink-950 px-3 py-2.5 font-mono text-sm text-manifest-100 outline-none focus:border-signal-teal";

  return (
    <div className="space-y-8">
      <Panel label="New inspection" id="inspect">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block font-sans text-sm text-manifest-200/80" htmlFor="repo-url">
              GitHub repository URL
            </label>
            <input
              id="repo-url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-sm text-manifest-200/80" htmlFor="repo-pick">
              Or pick from your quay
            </label>
            <select
              id="repo-pick"
              disabled={loadingRepos}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) setRepoUrl(e.target.value);
              }}
              className={inputClass}
            >
              <option value="">
                {loadingRepos ? "Loading repositories…" : "Select a repository"}
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
              <label
                className="mb-1.5 block font-sans text-sm text-manifest-200/80"
                htmlFor="project-type"
              >
                Project type
              </label>
              <select
                id="project-type"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className={inputClass}
              >
                <option value="commercial">Commercial</option>
                <option value="open-source">Open source</option>
              </select>
              <p className="mt-1.5 font-mono text-[11px] text-stamp-slate">
                Commercial flags GPL/AGPL for review.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block font-sans text-sm text-manifest-200/80" htmlFor="prefix">
                Private package prefix
              </label>
              <input
                id="prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="@mycompany/"
                className={inputClass}
              />
              <p className="mt-1.5 font-mono text-[11px] text-stamp-slate">
                Optional · dependency-confusion checks
              </p>
            </div>
          </div>

          {error ? (
            <p className="border border-stamp-red/40 bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={submitting || !repoUrl.trim()}>
              {submitting ? "Queuing…" : "Start inspection"}
            </Button>
            <a
              href={getLoginUrl({ privateRepos: true })}
              className="font-mono text-xs text-stamp-slate hover:text-signal-teal"
            >
              Need private repos? Re-authorize →
            </a>
          </div>
        </form>
      </Panel>

      <section id="history">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-manifest-100">
          Manifest history
        </h2>
        <p className="mt-1 font-mono text-xs text-stamp-slate">
          Last 50 berths · click a row to open the ledger
        </p>
        <div className="mt-3">
          <ScanHistory scans={history} />
        </div>
      </section>
    </div>
  );
}

export function useScanHistory(): Scan[] {
  const [history, setHistory] = useState<Scan[]>([]);
  useEffect(() => {
    fetchScans()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);
  return history;
}
