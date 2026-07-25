/**
 * Quaywatch API client.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getApiUrl(path: string = ""): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalized}`;
}

export type User = {
  id: string;
  github_id: string;
  username: string;
  avatar_url: string | null;
};

export type ScanDiff = {
  previous_scan_id: string | null;
  new_count: number;
  resolved_count: number;
  known_count: number;
  new_finding_ids: string[];
  resolved_titles: string[];
};

export type Scan = {
  id: string;
  repo_url: string;
  status: "queued" | "running" | "complete" | "failed";
  private_package_prefix: string | null;
  project_type: string;
  error_message: string | null;
  current_phase?: string | null;
  public_share_token?: string | null;
  created_at: string;
  completed_at: string | null;
  dependency_count?: number;
  finding_count?: number;
  vulnerability_count?: number;
  typosquat_count?: number;
  dep_confusion_count?: number;
  cicd_count?: number;
  secret_count?: number;
  license_count?: number;
  dependencies?: Dependency[];
  findings?: Finding[];
  diff?: ScanDiff | null;
};

export type Dependency = {
  id: string;
  name: string;
  version: string | null;
  ecosystem: string;
  is_direct: boolean;
  depth: number;
  parent_dependency_id: string | null;
};

export type Finding = {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  remediation: string | null;
  dependency_id: string | null;
  file_path: string | null;
  line_number: number | null;
  dependency_name?: string | null;
  dependency_version?: string | null;
  is_new?: boolean;
};

export type Repo = {
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
  language: string | null;
  updated_at: string | null;
};

export type ActivityEvent = {
  id: string;
  kind: string;
  message: string;
  repo_url: string | null;
  scan_id: string | null;
  status: string | null;
  created_at: string;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(getApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function getLoginUrl(options?: { privateRepos?: boolean }): string {
  const path = options?.privateRepos
    ? "/api/auth/github/login?private=true"
    : "/api/auth/github/login";
  return getApiUrl(path);
}

export async function fetchMe(): Promise<User | null> {
  const data = await apiFetch<{ user: User | null }>("/api/auth/me-or-null");
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}

export async function fetchRepos(): Promise<Repo[]> {
  return apiFetch<Repo[]>("/api/repos");
}

export async function createScan(input: {
  repo_url: string;
  private_package_prefix?: string;
  project_type?: string;
}): Promise<Scan> {
  return apiFetch<Scan>("/api/scans", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchScan(id: string): Promise<Scan> {
  return apiFetch<Scan>(`/api/scans/${id}`);
}

export async function fetchPublicReport(token: string): Promise<Scan> {
  return apiFetch<Scan>(`/api/public/reports/${token}`);
}

export async function fetchScans(): Promise<Scan[]> {
  return apiFetch<Scan[]>("/api/scans");
}

export async function fetchActivity(): Promise<ActivityEvent[]> {
  return apiFetch<ActivityEvent[]>("/api/activity");
}

export async function enableShare(scanId: string): Promise<{
  public_share_token: string | null;
  public_url: string | null;
}> {
  return apiFetch(`/api/scans/${scanId}/share`, { method: "POST" });
}

export async function revokeShare(scanId: string): Promise<{
  public_share_token: string | null;
  public_url: string | null;
}> {
  return apiFetch(`/api/scans/${scanId}/share`, { method: "DELETE" });
}

export function badgeSvgUrl(scanId: string): string {
  return getApiUrl(`/api/scans/${scanId}/badge.svg`);
}
