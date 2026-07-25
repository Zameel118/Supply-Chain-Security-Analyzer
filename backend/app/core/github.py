"""
Thin GitHub REST client — used for OAuth token exchange and reading repo metadata.
Never clones or executes repository code.
"""

from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

GITHUB_API = "https://api.github.com"
GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN = "https://github.com/login/oauth/access_token"

# Least privilege: public scans by default. Private repos need the broader `repo` scope.
SCOPE_PUBLIC = "read:user public_repo"
SCOPE_PRIVATE = "read:user repo"


def github_authorize_url(state: str, *, private_repos: bool = False) -> str:
    """Build the URL we send the user to on 'Login with GitHub'."""
    settings = get_settings()
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_oauth_redirect_uri,
        "scope": SCOPE_PRIVATE if private_repos else SCOPE_PUBLIC,
        "state": state,
    }
    return f"{GITHUB_AUTHORIZE}?{urlencode(params)}"


def exchange_code_for_token(code: str) -> str:
    """Trade the OAuth `code` for a GitHub access token."""
    settings = get_settings()
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            GITHUB_TOKEN,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_oauth_redirect_uri,
            },
        )
        response.raise_for_status()
        data = response.json()
    if "access_token" not in data:
        raise ValueError(data.get("error_description") or data.get("error") or "OAuth token exchange failed")
    return data["access_token"]


def auth_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def fetch_github_user(access_token: str) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(f"{GITHUB_API}/user", headers=auth_headers(access_token))
        response.raise_for_status()
        return response.json()


def list_user_repos(access_token: str, per_page: int = 50) -> list[dict[str, Any]]:
    """Return the signed-in user's repositories (first page is enough for Phase 1)."""
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{GITHUB_API}/user/repos",
            headers=auth_headers(access_token),
            params={
                "sort": "updated",
                "direction": "desc",
                "per_page": per_page,
                "affiliation": "owner,collaborator,organization_member",
            },
        )
        response.raise_for_status()
        return response.json()


def parse_repo_url(repo_url: str) -> tuple[str, str]:
    """
    Accept forms like:
      https://github.com/owner/repo
      https://github.com/owner/repo.git
      owner/repo
    Return (owner, repo).
    """
    cleaned = repo_url.strip().rstrip("/")
    if cleaned.endswith(".git"):
        cleaned = cleaned[:-4]

    if cleaned.startswith("https://github.com/"):
        cleaned = cleaned[len("https://github.com/") :]
    elif cleaned.startswith("http://github.com/"):
        cleaned = cleaned[len("http://github.com/") :]
    elif cleaned.startswith("github.com/"):
        cleaned = cleaned[len("github.com/") :]

    parts = [p for p in cleaned.split("/") if p]
    if len(parts) < 2:
        raise ValueError("Repo URL must look like https://github.com/owner/repo or owner/repo")
    return parts[0], parts[1]


def fetch_repo(access_token: str, owner: str, repo: str) -> dict[str, Any]:
    """Confirm a repo exists and is readable with the user's token."""
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}",
            headers=auth_headers(access_token),
        )
        if response.status_code == 404:
            raise ValueError(f"Repository {owner}/{repo} not found or not accessible")
        response.raise_for_status()
        return response.json()
