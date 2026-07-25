"""
Regex-based secret detection across repository file text.

IMPORTANT: findings must never include the raw secret value — only a masked
preview, file path, and line number.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass

import httpx

from app.models import FindingSeverity
from app.services.repo_files import fetch_file_text, list_repo_tree

SKIP_DIR_PARTS = {
    "node_modules",
    ".git",
    "vendor",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".venv",
    "venv",
    "coverage",
    "target",
    ".tox",
}

SKIP_SUFFIXES = (
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".pdf",
    ".zip",
    ".gz",
    ".tar",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".lock",
    ".min.js",
    ".min.css",
    ".map",
    ".svg",
)

# Prefer scanning source / config-like files
ALLOW_SUFFIXES = (
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".go",
    ".rb",
    ".java",
    ".kt",
    ".cs",
    ".php",
    ".rs",
    ".sh",
    ".bash",
    ".zsh",
    ".yml",
    ".yaml",
    ".json",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".env",
    ".txt",
    ".md",
    ".xml",
    ".properties",
    ".tf",
    ".hcl",
)

MAX_FILES = 120
MAX_FINDINGS = 100


@dataclass
class SecretHit:
    file_path: str
    line_number: int
    severity: FindingSeverity
    title: str
    description: str
    remediation: str
    rule_id: str


def mask_secret(value: str) -> str:
    """Show only a short prefix/suffix so the UI never displays the full secret."""
    value = value.strip()
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}…{value[-4:]} (len={len(value)})"


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = Counter(s)
    length = len(s)
    return -sum((c / length) * math.log2(c / length) for c in counts.values())


SECRET_RULES: list[tuple[str, re.Pattern[str], FindingSeverity, str]] = [
    (
        "aws_access_key",
        re.compile(r"\b(AKIA[0-9A-Z]{16})\b"),
        FindingSeverity.critical,
        "AWS access key ID",
    ),
    (
        "private_key",
        re.compile(r"-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----"),
        FindingSeverity.critical,
        "Private key header",
    ),
    (
        "github_token",
        re.compile(r"\b(gh[pousr]_[A-Za-z0-9_]{20,})\b"),
        FindingSeverity.critical,
        "GitHub token",
    ),
    (
        "slack_token",
        re.compile(r"\b(xox[baprs]-[A-Za-z0-9-]{10,})\b"),
        FindingSeverity.high,
        "Slack token",
    ),
    (
        "stripe_key",
        re.compile(r"\b(sk_(?:live|test)_[A-Za-z0-9]{16,})\b"),
        FindingSeverity.critical,
        "Stripe secret key",
    ),
    (
        "generic_assignment",
        re.compile(
            r"(?i)\b(api[_-]?key|secret|password|passwd|token|access[_-]?key)\b\s*[=:]\s*[\"']([A-Za-z0-9_\-/.+=]{32,})[\"']"
        ),
        FindingSeverity.high,
        "High-entropy secret-like assignment",
    ),
]

_HIGH_ENTROPY = re.compile(r"[\"']([A-Za-z0-9+/=_\-]{32,})[\"']")


def should_scan_path(path: str) -> bool:
    parts = path.replace("\\", "/").split("/")
    if any(p in SKIP_DIR_PARTS for p in parts):
        return False
    lower = path.lower()
    if any(lower.endswith(suf) for suf in SKIP_SUFFIXES):
        return False
    name = parts[-1]
    if name.startswith(".env"):
        return True
    if name in ("Dockerfile", "Jenkinsfile", "docker-compose.yml", "docker-compose.yaml"):
        return True
    return any(lower.endswith(suf) for suf in ALLOW_SUFFIXES)


def scan_text_for_secrets(path: str, content: str) -> list[SecretHit]:
    hits: list[SecretHit] = []
    lines = content.splitlines()

    for line_no, line in enumerate(lines, start=1):
        # Skip obvious placeholders
        if re.search(r"(?i)(your[_-]?api[_-]?key|xxx+|changeme|example\.com|placeholder)", line):
            continue

        for rule_id, pattern, severity, label in SECRET_RULES:
            for match in pattern.finditer(line):
                raw = match.group(1) if match.lastindex and match.lastindex >= 1 else match.group(0)
                # For generic_assignment, group 2 is the value
                if rule_id == "generic_assignment" and match.lastindex and match.lastindex >= 2:
                    raw = match.group(2)
                if rule_id == "generic_assignment" and shannon_entropy(raw) < 3.5:
                    continue
                masked = mask_secret(raw)
                hits.append(
                    SecretHit(
                        file_path=path,
                        line_number=line_no,
                        severity=severity,
                        title=f"Possible {label} in {path}",
                        description=(
                            f"Matched rule '{rule_id}' at {path}:{line_no}. "
                            f"Masked value: {masked}. The raw secret is not shown."
                        ),
                        remediation=(
                            "Rotate the credential immediately, remove it from git history if committed, "
                            "and load secrets from a vault / CI secret store instead."
                        ),
                        rule_id=rule_id,
                    )
                )

        # Generic high-entropy quoted strings (32+)
        for match in _HIGH_ENTROPY.finditer(line):
            raw = match.group(1)
            if shannon_entropy(raw) < 4.2:
                continue
            # Skip common non-secrets
            if raw.startswith("http") or "ABCDEF" in raw.upper():
                continue
            masked = mask_secret(raw)
            hits.append(
                SecretHit(
                    file_path=path,
                    line_number=line_no,
                    severity=FindingSeverity.medium,
                    title=f"High-entropy string in {path}",
                    description=(
                        f"Found a high-entropy 32+ character string at {path}:{line_no}. "
                        f"Masked value: {masked}. Verify this is not a leaked credential."
                    ),
                    remediation="Confirm the value is not a secret; if it is, rotate and remove it.",
                    rule_id="high_entropy",
                )
            )

    return hits


def scan_repo_secrets(
    access_token: str, owner: str, repo: str, default_branch: str
) -> list[SecretHit]:
    tree = list_repo_tree(access_token, owner, repo, default_branch)
    paths = [e["path"] for e in tree if e.get("path") and should_scan_path(e["path"])]
    # Prefer .env* and config-ish paths first
    paths.sort(key=lambda p: (0 if ".env" in p.lower() else 1, p))
    paths = paths[:MAX_FILES]

    hits: list[SecretHit] = []
    with httpx.Client(timeout=60.0) as client:
        for path in paths:
            if len(hits) >= MAX_FINDINGS:
                break
            text = fetch_file_text(
                access_token, owner, repo, path, client=client, max_bytes=100_000
            )
            if not text:
                continue
            hits.extend(scan_text_for_secrets(path, text))
            hits = hits[:MAX_FINDINGS]
    return hits
