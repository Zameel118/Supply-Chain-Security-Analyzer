/**
 * Shared helpers for calling the FastAPI backend.
 * credentials: "include" sends the httpOnly session cookie on every request.
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

export type Scan = {
  id: string;
  repo_url: string;
  status: "queued" | "running" | "complete" | "failed";
  private_package_prefix: string | null;
  project_type: string;
  error_message: string | null;
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
};

export type Repo = {
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
  language: string | null;
  updated_at: string | null;
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

export function getLoginUrl(): string {
  return getApiUrl("/api/auth/github/login");
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

export async function fetchScanDependencies(id: string): Promise<Dependency[]> {
  return apiFetch<Dependency[]>(`/api/scans/${id}/dependencies`);
}

export async function fetchScans(): Promise<Scan[]> {
  return apiFetch<Scan[]>("/api/scans");
}
