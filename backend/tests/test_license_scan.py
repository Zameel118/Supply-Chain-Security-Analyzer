"""Unit tests for license policy helpers."""

from app.models import FindingSeverity
from app.services.license_scan import (
    evaluate_license_policy,
    is_copyleft,
    is_proprietary,
    normalize_license,
)


def test_normalize_license_variants():
    assert normalize_license("MIT") == "MIT"
    assert normalize_license({"type": "Apache-2.0"}) == "Apache-2.0"
    assert normalize_license(["MIT", "Apache-2.0"]) == "MIT OR Apache-2.0"
    assert normalize_license(None) == "UNKNOWN"
    assert normalize_license("") == "UNKNOWN"


def test_copyleft_detection():
    assert is_copyleft("GPL-3.0") is True
    assert is_copyleft("AGPL-3.0-only") is True
    assert is_copyleft("LGPL-2.1") is True
    assert is_copyleft("MIT") is False
    assert is_copyleft("Apache-2.0") is False


def test_proprietary_detection():
    assert is_proprietary("UNLICENSED") is True
    assert is_proprietary("Proprietary") is True
    assert is_proprietary("MIT") is False


def test_commercial_flags_gpl():
    hit = evaluate_license_policy(
        package_name="copyleft-lib",
        license_label="GPL-3.0",
        project_type="commercial",
    )
    assert hit is not None
    assert hit.severity == FindingSeverity.medium
    assert "GPL" in hit.title or "Copyleft" in hit.title


def test_commercial_allows_mit():
    assert (
        evaluate_license_policy(
            package_name="lodash",
            license_label="MIT",
            project_type="commercial",
        )
        is None
    )


def test_open_source_allows_gpl():
    assert (
        evaluate_license_policy(
            package_name="copyleft-lib",
            license_label="GPL-3.0",
            project_type="open-source",
        )
        is None
    )


def test_open_source_flags_proprietary():
    hit = evaluate_license_policy(
        package_name="closed-sdk",
        license_label="UNLICENSED",
        project_type="open-source",
    )
    assert hit is not None
    assert hit.severity == FindingSeverity.medium


def test_commercial_unknown_is_low():
    hit = evaluate_license_policy(
        package_name="mystery",
        license_label="UNKNOWN",
        project_type="commercial",
    )
    assert hit is not None
    assert hit.severity == FindingSeverity.low
