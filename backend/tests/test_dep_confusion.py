"""Unit tests for dependency-confusion helpers."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.services.dep_confusion import (
    matches_private_prefix,
    normalize_prefix,
    public_package_exists,
    scan_dependencies_for_confusion,
)


def test_normalize_prefix_variants():
    assert normalize_prefix("  @MyCompany/*  ") == "@mycompany/"
    assert normalize_prefix("@mycompany/") == "@mycompany/"
    assert normalize_prefix("acme-") == "acme-"
    assert normalize_prefix("") is None
    assert normalize_prefix(None) is None


def test_matches_private_prefix():
    assert matches_private_prefix("@mycompany/utils", "@mycompany/")
    assert matches_private_prefix("@mycompany/utils", "@mycompany")
    assert not matches_private_prefix("lodash", "@mycompany/")
    assert matches_private_prefix("acme-core", "acme-")


def test_public_package_exists_npm_200():
    client = MagicMock()
    resp = MagicMock(status_code=200)
    client.get.return_value = resp
    exists, url = public_package_exists("npm", "@mycompany/utils", client)
    assert exists is True
    assert "registry.npmjs.org" in (url or "")


def test_public_package_exists_pypi_404():
    client = MagicMock()
    resp = MagicMock(status_code=404)
    client.get.return_value = resp
    exists, _url = public_package_exists("PyPI", "mycompany-internal-lib", client)
    assert exists is False


def test_scan_skips_without_prefix():
    deps = [SimpleNamespace(id=uuid4(), name="@mycompany/x", ecosystem="npm")]
    assert scan_dependencies_for_confusion(deps, None) == []
    assert scan_dependencies_for_confusion(deps, "") == []


def test_scan_flags_when_public_exists():
    dep_id = uuid4()
    deps = [
        SimpleNamespace(id=dep_id, name="@mycompany/utils", ecosystem="npm", version="1.0.0"),
        SimpleNamespace(id=uuid4(), name="lodash", ecosystem="npm", version="4.0.0"),
    ]

    with patch("app.services.dep_confusion.public_package_exists") as mock_exists:
        mock_exists.return_value = (True, "https://registry.npmjs.org/@mycompany%2Futils")
        with patch("app.services.dep_confusion.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value = MagicMock()
            hits = scan_dependencies_for_confusion(deps, "@mycompany/")

    assert len(hits) == 1
    assert hits[0].package_name == "@mycompany/utils"
    assert hits[0].dependency_id == dep_id
    mock_exists.assert_called()


def test_scan_no_flag_when_not_public():
    deps = [
        SimpleNamespace(id=uuid4(), name="@mycompany/private-only", ecosystem="npm", version="1.0.0"),
    ]
    with patch("app.services.dep_confusion.public_package_exists") as mock_exists:
        mock_exists.return_value = (False, "https://registry.npmjs.org/@mycompany%2Fprivate-only")
        with patch("app.services.dep_confusion.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value = MagicMock()
            hits = scan_dependencies_for_confusion(deps, "@mycompany/*")
    assert hits == []
