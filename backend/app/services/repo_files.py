"""
Shared helpers to list and fetch repository file text via GitHub API.
Static analysis only — never executes repo code.
"""

from __future__ import annotations

import base64
from typing import Any

import httpx

from app.core.github import GITHUB_API, auth_headers


def list_repo_tree(
    access_token: str, owner: str, repo: str, default_branch: str
) -> list[dict[str, Any]]:
    """Return blob entries from the recursive git tree."""
    with httpx.Client(timeout=60.0) as client:
        response = client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{default_branch}",
            headers=auth_headers(access_token),
            params={"recursive": "1"},
        )
        response.raise_for_status()
        data = response.json()
    return [e for e in (data.get("tree") or []) if e.get("type") == "blob"]


def fetch_file_text(
    access_token: str,
    owner: str,
    repo: str,
    path: str,
    *,
    client: httpx.Client | None = None,
    max_bytes: int = 200_000,
) -> str | None:
    """Return decoded UTF-8 file contents (truncated), or None if missing/too large."""
    own_client = client is None
    http = client or httpx.Client(timeout=60.0)
    try:
        response = http.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
            headers=auth_headers(access_token),
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        data = response.json()
        if isinstance(data, list):
            return None
        size = data.get("size") or 0
        if size > max_bytes:
            return None
        if data.get("encoding") == "base64" and data.get("content"):
            raw = base64.b64decode(data["content"])
            return raw[:max_bytes].decode("utf-8", errors="replace")
        if data.get("download_url"):
            raw_resp = http.get(data["download_url"], headers=auth_headers(access_token))
            raw_resp.raise_for_status()
            return raw_resp.content[:max_bytes].decode("utf-8", errors="replace")
        return None
    finally:
        if own_client:
            http.close()
