"""Unit tests for OSV severity mapping and fixed-version extraction."""

from app.models import FindingSeverity
from app.services.vuln_scan import (
    build_query,
    extract_fixed_versions,
    map_cvss_score,
    map_severity_label,
    severity_from_osv,
)


def test_map_cvss_score_bands():
    assert map_cvss_score(9.8) == FindingSeverity.critical
    assert map_cvss_score(7.5) == FindingSeverity.high
    assert map_cvss_score(5.0) == FindingSeverity.medium
    assert map_cvss_score(2.1) == FindingSeverity.low
    assert map_cvss_score(0) == FindingSeverity.info


def test_map_severity_label():
    assert map_severity_label("CRITICAL") == FindingSeverity.critical
    assert map_severity_label("moderate") == FindingSeverity.medium
    assert map_severity_label("HIGH") == FindingSeverity.high
    assert map_severity_label("UNKNOWN") is None


def test_severity_from_osv_database_specific():
    vuln = {
        "id": "GHSA-test",
        "database_specific": {"severity": "HIGH"},
        "severity": [{"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"}],
    }
    assert severity_from_osv(vuln) == FindingSeverity.high


def test_severity_from_osv_numeric_score():
    vuln = {"id": "TEST", "severity": [{"type": "CVSS_V3", "score": "9.1"}]}
    assert severity_from_osv(vuln) == FindingSeverity.critical


def test_severity_default_medium():
    assert severity_from_osv({"id": "X"}) == FindingSeverity.medium


def test_extract_fixed_versions():
    vuln = {
        "affected": [
            {
                "package": {"ecosystem": "npm", "name": "lodash"},
                "ranges": [
                    {
                        "type": "SEMVER",
                        "events": [{"introduced": "0"}, {"fixed": "4.17.21"}],
                    }
                ],
            }
        ]
    }
    assert extract_fixed_versions(vuln, "npm", "lodash") == ["4.17.21"]


def test_build_query_requires_version():
    assert build_query("npm", "lodash", None) is None
    assert build_query("npm", "lodash", "4.17.20") == {
        "package": {"name": "lodash", "ecosystem": "npm"},
        "version": "4.17.20",
    }
    assert build_query("Cargo", "serde", "1.0.0") is None
