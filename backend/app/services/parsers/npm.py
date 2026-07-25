"""
Parse npm package.json and package-lock.json (lockfileVersion 1–3).
Static text parsing only — never installs packages.
"""

from __future__ import annotations

import json
from typing import Any

from app.services.parsers.base import ParsedDependency

ECOSYSTEM = "npm"


def _clean_version(raw: Any) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text or text == "*":
        return None
    for prefix in ("^", "~", ">=", "<=", ">", "<", "="):
        if text.startswith(prefix):
            text = text[len(prefix) :].strip()
            break
    text = text.split()[0] if text else text
    return text or None


def parse_package_json(content: str) -> list[ParsedDependency]:
    """Direct dependencies from package.json (prod + optional)."""
    data = json.loads(content)
    results: list[ParsedDependency] = []
    for section in ("dependencies", "optionalDependencies"):
        deps = data.get(section) or {}
        if not isinstance(deps, dict):
            continue
        for name, version in deps.items():
            results.append(
                ParsedDependency(
                    name=name,
                    version=_clean_version(version),
                    ecosystem=ECOSYSTEM,
                    is_direct=True,
                    depth=0,
                    key=f"npm:direct:{name}",
                    parent_key=None,
                )
            )
    return results


def parse_package_lock(content: str) -> list[ParsedDependency]:
    """
    Prefer lockfile over package.json when present — includes transitive deps.
    Supports lockfileVersion 1 (`dependencies` tree) and 2/3 (`packages` map).
    """
    data = json.loads(content)
    if "packages" in data and isinstance(data["packages"], dict):
        return _parse_lock_v2(data)
    if "dependencies" in data and isinstance(data["dependencies"], dict):
        return _parse_lock_v1(data.get("dependencies") or {}, parent_key=None, depth=0)
    return []


def _parse_lock_v2(data: dict[str, Any]) -> list[ParsedDependency]:
    packages: dict[str, Any] = data["packages"]
    root = packages.get("") or {}
    direct_names = set((root.get("dependencies") or {}).keys())
    direct_names |= set((root.get("optionalDependencies") or {}).keys())

    results: list[ParsedDependency] = []
    path_to_key: dict[str, str] = {}
    key_to_depth: dict[str, int] = {}

    paths = sorted(
        (p for p in packages.keys() if p and "node_modules/" in p),
        key=lambda p: p.count("node_modules/"),
    )

    for path in paths:
        meta = packages[path] or {}
        name = meta.get("name") or path.rsplit("node_modules/", 1)[-1]
        version = _clean_version(meta.get("version"))
        parent_path = _parent_package_path(path)
        parent_key = path_to_key.get(parent_path) if parent_path else None

        if parent_key is None:
            depth = 0
            is_direct = name in direct_names
        else:
            depth = key_to_depth.get(parent_key, 0) + 1
            is_direct = False

        key = f"npm:{path}"
        path_to_key[path] = key
        key_to_depth[key] = depth
        results.append(
            ParsedDependency(
                name=name,
                version=version,
                ecosystem=ECOSYSTEM,
                is_direct=is_direct,
                depth=depth,
                key=key,
                parent_key=parent_key,
            )
        )
    return results


def _parent_package_path(path: str) -> str | None:
    """
    node_modules/a → None
    node_modules/a/node_modules/b → node_modules/a
    """
    if "/node_modules/" not in path:
        return None
    return path.rsplit("/node_modules/", 1)[0]


def _parse_lock_v1(
    deps: dict[str, Any], parent_key: str | None, depth: int
) -> list[ParsedDependency]:
    results: list[ParsedDependency] = []
    for name, meta in deps.items():
        if not isinstance(meta, dict):
            continue
        version = _clean_version(meta.get("version"))
        key = f"npm:v1:{parent_key or 'root'}:{name}@{version or '?'}"
        results.append(
            ParsedDependency(
                name=name,
                version=version,
                ecosystem=ECOSYSTEM,
                is_direct=depth == 0,
                depth=depth,
                key=key,
                parent_key=parent_key,
            )
        )
        nested = meta.get("dependencies") or {}
        if isinstance(nested, dict) and nested:
            results.extend(_parse_lock_v1(nested, parent_key=key, depth=depth + 1))
    return results
