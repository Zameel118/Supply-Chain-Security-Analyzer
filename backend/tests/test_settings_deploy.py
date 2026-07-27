"""Settings helpers used in production (Render URL normalization, etc.)."""

from app.core.config import Settings


def test_normalize_postgres_url_from_render() -> None:
    settings = Settings(
        secret_key="unit-test-secret-key-not-for-prod",
        token_encryption_key="dGVzdC1mZXJuZXQta2V5LTEyMzQ1Njc4OTBhYmNkZWY=",
        database_url="postgres://user:pass@host:5432/db",
    )
    assert settings.database_url.startswith("postgresql+psycopg://")
    assert "user:pass@host:5432/db" in settings.database_url


def test_app_version_readable() -> None:
    from app.core.version import get_app_version

    v = get_app_version()
    assert v and "." in v


def test_cookie_samesite_cross_origin_when_secure() -> None:
    local = Settings(
        secret_key="unit-test-secret-key-not-for-prod",
        token_encryption_key="dGVzdC1mZXJuZXQta2V5LTEyMzQ1Njc4OTBhYmNkZWY=",
        frontend_url="http://localhost:3000",
    )
    assert local.cookie_secure is False
    assert local.cookie_samesite == "lax"

    prod = Settings(
        secret_key="unit-test-secret-key-not-for-prod",
        token_encryption_key="dGVzdC1mZXJuZXQta2V5LTEyMzQ1Njc4OTBhYmNkZWY=",
        frontend_url="https://quaywatch.vercel.app",
    )
    assert prod.cookie_secure is True
    assert prod.cookie_samesite == "none"
