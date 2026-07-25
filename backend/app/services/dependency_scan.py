"""
Find dependency manifests in a GitHub repo (via Contents + Git Trees API)
and parse them into a normalized dependency list.

Never clones or executes repository code — file text only.
"""

from __future__ import annotations

import base64
from collections.abc import Callable

import httpx

from app.core.github import GITHUB_API, auth_headers
from app.services.parsers import (
    ParsedDependency,
    parse_gemfile_lock,
    parse_package_json,
    parse_package_lock,
    parse_pipfile_lock,
    parse_poetry_lock,
    parse_pom_xml,
    parse_requirements_txt,
)

# filename (lower) → parser. Lockfiles preferred over manifests when both exist.
LOCKFILE_PARSERS: dict[str, Callable[[str], list[ParsedDependency]]] = {
    "package-lock.json": parse_package_lock,
    "pipfile.lock": parse_pipfile_lock,
    "poetry.lock": parse_poetry_lock,
    "gemfile.lock": parse_gemfile_lock,
}

MANIFEST_PARSERS: dict[str, Callable[[str], list[ParsedDependency]]] = {
    "package.json": parse_package_json,
    "requirements.txt": parse_requirements_txt,
    "pom.xml": parse_pom_xml,
}

INTERESTING_NAMES = set(LOCKFILE_PARSERS) | set(MANIFEST_PARSERS)


def fetch_file_text(access_token: str, owner: str, repo: str, path: str) -> str | None:
    """Return decoded file contents, or None if missing."""
    with httpx.Client(timeout=60.0) as client:
        response = client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
            headers=auth_headers(access_token),
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        data = response.json()
        if isinstance(data, list):
            return None
        if data.get("encoding") == "base64" and data.get("content"):
            return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        if data.get("download_url"):
            raw = client.get(data["download_url"], headers=auth_headers(access_token))
            raw.raise_for_status()
            return raw.text
        return None


def list_manifest_paths(access_token: str, owner: str, repo: str, default_branch: str) -> list[str]:
    """Use the recursive git tree to find every interesting manifest/lockfile path."""
    with httpx.Client(timeout=60.0) as client:
        tree_resp = client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{default_branch}",
            headers=auth_headers(access_token),
            params={"recursive": "1"},
        )
        tree_resp.raise_for_status()
        tree = tree_resp.json()

    paths: list[str] = []
    for entry in tree.get("tree") or []:
        if entry.get("type") != "blob":
            continue
        path = entry.get("path") or ""
        name = path.rsplit("/", 1)[-1].lower()
        # requirements-dev.txt etc.
        if name in INTERESTING_NAMES or (
            name.startswith("requirements") and name.endswith(".txt")
        ):
            paths.append(path)
    return paths


def collect_dependencies(
    access_token: str, owner: str, repo: str, default_branch: str
) -> tuple[list[ParsedDependency], list[str]]:
    """
    Discover manifests, parse them, return (deps, files_used).
    When a directory has both package-lock.json and package.json, only the lockfile is used.
    """
    paths = list_manifest_paths(access_token, owner, repo, default_branch)
    if not paths:
        return [], []

    # Group by directory so we can prefer lockfiles
    by_dir: dict[str, list[str]] = {}
    for path in paths:
        directory = path.rsplit("/", 1)[0] if "/" in path else ""
        by_dir.setdefault(directory, []).append(path)

    all_deps: list[ParsedDependency] = []
    files_used: list[str] = []

    for directory, dir_paths in sorted(by_dir.items()):
        lower_map = {p.rsplit("/", 1)[-1].lower(): p for p in dir_paths}

        # Prefer npm lockfile over package.json in the same folder
        if "package-lock.json" in lower_map:
            path = lower_map["package-lock.json"]
            text = fetch_file_text(access_token, owner, repo, path)
            if text:
                deps = parse_package_lock(text)
                all_deps.extend(_prefix_keys(deps, path))
                files_used.append(path)
        elif "package.json" in lower_map:
            path = lower_map["package.json"]
            text = fetch_file_text(access_token, owner, repo, path)
            if text:
                deps = parse_package_json(text)
                all_deps.extend(_prefix_keys(deps, path))
                files_used.append(path)

        for lock_name, parser in LOCKFILE_PARSERS.items():
            if lock_name == "package-lock.json":
                continue
            if lock_name in lower_map:
                path = lower_map[lock_name]
                text = fetch_file_text(access_token, owner, repo, path)
                if text:
                    deps = parser(text)
                    all_deps.extend(_prefix_keys(deps, path))
                    files_used.append(path)

        for path in dir_paths:
            name = path.rsplit("/", 1)[-1].lower()
            if name.startswith("requirements") and name.endswith(".txt"):
                text = fetch_file_text(access_token, owner, repo, path)
                if text:
                    deps = parse_requirements_txt(text)
                    all_deps.extend(_prefix_keys(deps, path))
                    files_used.append(path)
            elif name == "pom.xml":
                text = fetch_file_text(access_token, owner, repo, path)
                if text:
                    deps = parse_pom_xml(text)
                    all_deps.extend(_prefix_keys(deps, path))
                    files_used.append(path)

    return _dedupe(all_deps), files_used


def _prefix_keys(deps: list[ParsedDependency], source_path: str) -> list[ParsedDependency]:
    """Make keys unique across monorepo folders."""
    prefix = source_path
    out: list[ParsedDependency] = []
    for dep in deps:
        new_key = f"{prefix}::{dep.key}"
        new_parent = f"{prefix}::{dep.parent_key}" if dep.parent_key else None
        out.append(
            ParsedDependency(
                name=dep.name,
                version=dep.version,
                ecosystem=dep.ecosystem,
                is_direct=dep.is_direct,
                depth=dep.depth,
                key=new_key,
                parent_key=new_parent,
            )
        )
    return out


def _dedupe(deps: list[ParsedDependency]) -> list[ParsedDependency]:
    """Keep first occurrence of each key."""
    seen: set[str] = set()
    out: list[ParsedDependency] = []
    for dep in deps:
        if dep.key in seen:
            continue
        seen.add(dep.key)
        out.append(dep)
    return out
