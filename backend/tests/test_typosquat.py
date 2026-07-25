"""Unit tests for typosquatting helpers."""

from app.services.typosquat import (
    find_typosquat_targets,
    levenshtein,
    normalize_homoglyphs,
    severity_for_match,
)
from app.models import FindingSeverity


def test_levenshtein_basic():
    assert levenshtein("lodash", "lodash") == 0
    assert levenshtein("lodash", "lodahs") == 2  # swap-ish via edits
    assert levenshtein("react", "raect") == 2
    assert levenshtein("express", "expresss") == 1
    assert levenshtein("abc", "abcd") == 1


def test_normalize_homoglyphs_digits_and_separators():
    assert normalize_homoglyphs("l0dash") == "lodash"
    assert normalize_homoglyphs("lo-dash") == "lodash"
    assert normalize_homoglyphs("React") == "react"


def test_normalize_cyrillic_lookalike():
    # Cyrillic 'а' and 'е' look like latin a/e
    assert normalize_homoglyphs("rеаct") == "react"


def test_exact_popular_not_flagged():
    assert find_typosquat_targets("lodash", "npm") == []
    assert find_typosquat_targets("requests", "PyPI") == []


def test_levenshtein_near_miss_flagged():
    hits = find_typosquat_targets("lodahs", "npm")
    targets = {t for t, _d, _k in hits}
    assert "lodash" in targets


def test_homoglyph_flagged():
    hits = find_typosquat_targets("l0dash", "npm")
    assert any(t == "lodash" and k == "homoglyph" for t, _d, k in hits)


def test_severity_bands():
    assert severity_for_match(0, "homoglyph") == FindingSeverity.high
    assert severity_for_match(1, "levenshtein") == FindingSeverity.high
    assert severity_for_match(2, "levenshtein") == FindingSeverity.medium
