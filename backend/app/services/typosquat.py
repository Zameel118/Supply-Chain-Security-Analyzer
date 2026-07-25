"""
Typosquatting detection against popular-package name lists.

Flags a dependency when its name is:
- not itself a known popular package, AND
- within Levenshtein distance ≤ 2 of a popular name, OR
- equal to a popular name after homoglyph / lookalike normalization.
"""

from __future__ import annotations

import json
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any
from uuid import UUID

from app.models import FindingSeverity

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "popular"

# Map lookalike / confusing characters onto ASCII stand-ins
HOMOGLYPH_MAP = str.maketrans(
    {
        # digits as letters
        "0": "o",
        "1": "l",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "8": "b",
        # common cyrillic / confusable lookalikes
        "о": "o",
        "а": "a",
        "е": "e",
        "р": "p",
        "с": "c",
        "у": "y",
        "х": "x",
        "і": "i",
        "|": "l",
        "!": "i",
        "$": "s",
        "@": "a",
    }
)

ECOSYSTEM_FILES = {
    "npm": "npm.json",
    "PyPI": "pypi.json",
    "RubyGems": "rubygems.json",
    "Maven": "maven.json",
}


@dataclass
class TyposquatHit:
    dependency_id: UUID
    package_name: str
    suspected_target: str
    distance: int
    match_kind: str  # "levenshtein" | "homoglyph"
    severity: FindingSeverity
    title: str
    description: str
    remediation: str


def levenshtein(a: str, b: str) -> int:
    """Classic edit distance (insert / delete / substitute)."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    # Ensure a is the shorter string for memory locality
    if len(a) > len(b):
        a, b = b, a
    prev = list(range(len(a) + 1))
    for j, bj in enumerate(b, start=1):
        curr = [j]
        for i, ai in enumerate(a, start=1):
            ins = curr[i - 1] + 1
            delete = prev[i] + 1
            sub = prev[i - 1] + (0 if ai == bj else 1)
            curr.append(min(ins, delete, sub))
        prev = curr
    return prev[-1]


def normalize_homoglyphs(name: str) -> str:
    """Lowercase + NFKC + map lookalike characters for comparison."""
    text = unicodedata.normalize("NFKC", name).lower()
    text = text.translate(HOMOGLYPH_MAP)
    # Drop common separators attackers insert: lodash vs lo-dash vs lod_ash
    for ch in ("-", "_", "."):
        text = text.replace(ch, "")
    return text


def package_compare_name(ecosystem: str, name: str) -> str:
    """
    npm scoped packages: compare on the unscoped part as well as full name.
    Maven: compare full group:artifact.
    """
    if ecosystem == "npm" and name.startswith("@") and "/" in name:
        return name.split("/", 1)[1]
    return name


@lru_cache(maxsize=8)
def load_popular_names(ecosystem: str) -> frozenset[str]:
    filename = ECOSYSTEM_FILES.get(ecosystem)
    if not filename:
        return frozenset()
    path = DATA_DIR / filename
    if not path.exists():
        return frozenset()
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return frozenset(str(x).lower() for x in data)
    return frozenset()


@lru_cache(maxsize=8)
def _popular_normalized_index(ecosystem: str) -> dict[str, str]:
    """normalized_form → canonical popular name (first wins)."""
    index: dict[str, str] = {}
    for name in load_popular_names(ecosystem):
        norm = normalize_homoglyphs(name)
        index.setdefault(norm, name)
    return index


def find_typosquat_targets(
    package_name: str,
    ecosystem: str,
    *,
    max_distance: int = 2,
) -> list[tuple[str, int, str]]:
    """
    Return list of (popular_name, distance, match_kind) for suspicious matches.
    Empty if the package itself is popular (assumed legitimate).
    """
    popular = load_popular_names(ecosystem)
    if not popular:
        return []

    compare = package_compare_name(ecosystem, package_name).lower()
    full_lower = package_name.lower()

    # Exact popular name → not a typosquat
    if full_lower in popular or compare in popular:
        return []

    hits: list[tuple[str, int, str]] = []

    # Homoglyph / separator-normalized exact match against a popular package
    norm = normalize_homoglyphs(compare)
    norm_index = _popular_normalized_index(ecosystem)
    if norm in norm_index:
        target = norm_index[norm]
        if target != full_lower and target != compare:
            hits.append((target, 0, "homoglyph"))

    # Levenshtein against popular names of similar length
    for candidate in popular:
        # Also compare against unscoped form for scoped popular packages
        cand_compare = package_compare_name(ecosystem, candidate)
        for cand in {candidate, cand_compare}:
            if abs(len(compare) - len(cand)) > max_distance:
                continue
            dist = levenshtein(compare, cand)
            if 0 < dist <= max_distance:
                hits.append((candidate, dist, "levenshtein"))

    # Deduplicate by target, keep best (lowest distance, prefer homoglyph)
    best: dict[str, tuple[str, int, str]] = {}
    for target, dist, kind in hits:
        prev = best.get(target)
        if prev is None or dist < prev[1] or (dist == prev[1] and kind == "homoglyph"):
            best[target] = (target, dist, kind)
    return sorted(best.values(), key=lambda x: (x[1], x[0]))


def severity_for_match(distance: int, match_kind: str) -> FindingSeverity:
    if match_kind == "homoglyph":
        return FindingSeverity.high
    if distance <= 1:
        return FindingSeverity.high
    return FindingSeverity.medium


def scan_dependencies_for_typosquats(deps: list[Any]) -> list[TyposquatHit]:
    """Check each dependency name against popular-package lists."""
    results: list[TyposquatHit] = []
    seen: set[tuple[UUID, str]] = set()

    for dep in deps:
        targets = find_typosquat_targets(dep.name, dep.ecosystem)
        for target, dist, kind in targets[:3]:  # at most 3 suspects per package
            key = (dep.id, target)
            if key in seen:
                continue
            seen.add(key)
            severity = severity_for_match(dist, kind)
            if kind == "homoglyph":
                why = (
                    f"After normalizing lookalike characters / separators, "
                    f"'{dep.name}' matches popular package '{target}'."
                )
            else:
                why = (
                    f"'{dep.name}' is within edit distance {dist} of popular package '{target}'."
                )
            results.append(
                TyposquatHit(
                    dependency_id=dep.id,
                    package_name=dep.name,
                    suspected_target=target,
                    distance=dist,
                    match_kind=kind,
                    severity=severity,
                    title=f"Possible typosquat: {dep.name} ≈ {target}",
                    description=(
                        f"{why} Attackers publish lookalike names to steal installs. "
                        f"Confirm '{dep.name}' is the package you intended."
                    ),
                    remediation=(
                        f"Verify the package publisher and spelling. "
                        f"If you meant '{target}', replace '{dep.name}' with '{target}'."
                    ),
                )
            )
    return results
