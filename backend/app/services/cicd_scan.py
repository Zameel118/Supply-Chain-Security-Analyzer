"""
CI/CD pipeline security checks (GitHub Actions, GitLab CI, Jenkins).

Looks for:
- unpinned third-party actions (no commit SHA)
- curl|bash / wget|sh style installs
- base64-decode-and-exec patterns
- insecure secret echoing / logging
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import httpx
import yaml

from app.models import FindingSeverity
from app.services.repo_files import fetch_file_text, list_repo_tree

# 40-char hex = full git SHA; also accept longer SHAs
_SHA_REF = re.compile(r"^[0-9a-f]{40,}$", re.IGNORECASE)
_CURL_BASH = re.compile(
    r"(curl|wget)\b[^\n|]*\|\s*(ba)?sh\b",
    re.IGNORECASE,
)
_BASE64_EXEC = re.compile(
    r"base64\s+(-d|--decode| -D)\b[^\n|]*\|\s*(ba)?sh\b"
    r"|echo\s+[A-Za-z0-9+/=\s]{20,}\s*\|\s*base64\s+(-d|--decode)",
    re.IGNORECASE,
)
_ECHO_SECRET = re.compile(
    r"echo\s+[\"']?\$\{\{\s*secrets\.",
    re.IGNORECASE,
)
_PRINT_SECRET = re.compile(
    r"(printenv|env)\b.*secrets\.|console\.log\([^\)]*secrets\.",
    re.IGNORECASE,
)

CI_PATH_HINTS = (
    ".github/workflows/",
    ".gitlab-ci.yml",
    "Jenkinsfile",
)


@dataclass
class CicdHit:
    file_path: str
    line_number: int | None
    severity: FindingSeverity
    title: str
    description: str
    remediation: str


def is_ci_path(path: str) -> bool:
    lower = path.replace("\\", "/")
    name = lower.rsplit("/", 1)[-1]
    if lower.startswith(".github/workflows/") and name.endswith((".yml", ".yaml")):
        return True
    if name == ".gitlab-ci.yml" or lower.endswith("/.gitlab-ci.yml"):
        return True
    if name == "Jenkinsfile":
        return True
    return False


def action_is_pinned(uses: str) -> bool:
    """True if the action ref looks like a full commit SHA (or is a local path)."""
    uses = uses.strip()
    if uses.startswith("./") or uses.startswith(".\\"):
        return True  # local action
    if "@" not in uses:
        return False
    ref = uses.rsplit("@", 1)[-1].strip()
    return bool(_SHA_REF.match(ref))


def is_third_party_action(uses: str) -> bool:
    """Flag actions not clearly first-party local paths."""
    uses = uses.strip()
    if uses.startswith("./"):
        return False
    return True


def _line_number_of(content: str, snippet: str) -> int | None:
    for i, line in enumerate(content.splitlines(), start=1):
        if snippet in line:
            return i
    return None


def analyze_github_actions_yaml(path: str, content: str) -> list[CicdHit]:
    hits: list[CicdHit] = []
    try:
        data = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        hits.append(
            CicdHit(
                file_path=path,
                line_number=None,
                severity=FindingSeverity.low,
                title=f"Invalid workflow YAML: {path}",
                description=f"Could not parse workflow file: {exc}",
                remediation="Fix YAML syntax so the workflow can be reviewed and run safely.",
            )
        )
        return hits

    if not isinstance(data, dict):
        return hits

    jobs = data.get("jobs") or {}
    if isinstance(jobs, dict):
        for _job_name, job in jobs.items():
            if not isinstance(job, dict):
                continue
            steps = job.get("steps") or []
            if not isinstance(steps, list):
                continue
            for step in steps:
                if not isinstance(step, dict):
                    continue
                uses = step.get("uses")
                if isinstance(uses, str) and is_third_party_action(uses) and not action_is_pinned(uses):
                    hits.append(
                        CicdHit(
                            file_path=path,
                            line_number=_line_number_of(content, uses),
                            severity=FindingSeverity.medium,
                            title=f"Unpinned GitHub Action: {uses}",
                            description=(
                                f"Workflow '{path}' uses action '{uses}' without a full commit SHA. "
                                "A mutable tag (e.g. @v4) can be moved to run different code later."
                            ),
                            remediation=(
                                "Pin third-party actions to a full 40-character commit SHA, "
                                "e.g. actions/checkout@<sha>."
                            ),
                        )
                    )

                for key in ("run",):
                    script = step.get(key)
                    if isinstance(script, str):
                        hits.extend(_analyze_shell_script(path, content, script))

    return _dedupe_hits(hits)


def analyze_generic_ci_file(path: str, content: str) -> list[CicdHit]:
    """GitLab CI / Jenkinsfile — focus on dangerous shell patterns."""
    return _dedupe_hits(_analyze_shell_script(path, content, content))


def _analyze_shell_script(path: str, full_content: str, script: str) -> list[CicdHit]:
    hits: list[CicdHit] = []
    for match in _CURL_BASH.finditer(script):
        snippet = match.group(0)[:80]
        hits.append(
            CicdHit(
                file_path=path,
                line_number=_line_number_of(full_content, match.group(0)[:40]),
                severity=FindingSeverity.high,
                title="Pipeline pipes remote script into a shell",
                description=(
                    f"Found `{snippet}` in '{path}'. Downloading and executing remote scripts "
                    "lets a compromised URL run arbitrary code in CI."
                ),
                remediation="Download scripts, verify checksums/signatures, then run them explicitly.",
            )
        )
    for match in _BASE64_EXEC.finditer(script):
        hits.append(
            CicdHit(
                file_path=path,
                line_number=_line_number_of(full_content, match.group(0)[:40]),
                severity=FindingSeverity.high,
                title="Base64 decode piped to shell",
                description=(
                    f"Found a base64-decode-and-exec pattern in '{path}'. This often hides "
                    "malicious payloads in CI logs."
                ),
                remediation="Avoid decode-and-exec. Use reviewed scripts checked into the repo.",
            )
        )
    for match in _ECHO_SECRET.finditer(script):
        hits.append(
            CicdHit(
                file_path=path,
                line_number=_line_number_of(full_content, match.group(0)[:40]),
                severity=FindingSeverity.high,
                title="Secret may be echoed in CI logs",
                description=(
                    f"Workflow '{path}' appears to echo a GitHub Actions secret into logs, "
                    "which can leak credentials."
                ),
                remediation="Never echo secrets. Pass them via env and keep log redaction enabled.",
            )
        )
    for match in _PRINT_SECRET.finditer(script):
        hits.append(
            CicdHit(
                file_path=path,
                line_number=_line_number_of(full_content, match.group(0)[:40]),
                severity=FindingSeverity.medium,
                title="Possible secret logging in CI",
                description=f"Suspicious secret logging pattern in '{path}'.",
                remediation="Remove debug prints that may include secrets from CI scripts.",
            )
        )
    return hits


def _dedupe_hits(hits: list[CicdHit]) -> list[CicdHit]:
    seen: set[tuple[str, str, int | None]] = set()
    out: list[CicdHit] = []
    for h in hits:
        key = (h.file_path, h.title, h.line_number)
        if key in seen:
            continue
        seen.add(key)
        out.append(h)
    return out


def scan_repo_cicd(
    access_token: str, owner: str, repo: str, default_branch: str
) -> list[CicdHit]:
    """Discover CI files and return findings."""
    tree = list_repo_tree(access_token, owner, repo, default_branch)
    ci_paths = [e["path"] for e in tree if e.get("path") and is_ci_path(e["path"])]
    if not ci_paths:
        return []

    hits: list[CicdHit] = []
    with httpx.Client(timeout=60.0) as client:
        for path in ci_paths[:40]:
            text = fetch_file_text(access_token, owner, repo, path, client=client)
            if not text:
                continue
            name = path.rsplit("/", 1)[-1]
            if path.startswith(".github/workflows/"):
                hits.extend(analyze_github_actions_yaml(path, text))
            elif name in (".gitlab-ci.yml", "Jenkinsfile") or path.endswith("/.gitlab-ci.yml"):
                hits.extend(analyze_generic_ci_file(path, text))
    return hits
