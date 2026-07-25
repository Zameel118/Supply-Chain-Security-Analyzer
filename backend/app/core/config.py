"""
App settings loaded from environment variables (.env / Docker Compose).
Change values in the project-root .env file — do not hardcode secrets here.
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database & Redis
    database_url: str = (
        "postgresql+psycopg://scsa:scsa_dev_password@localhost:5432/supply_chain_analyzer"
    )
    redis_url: str = "redis://localhost:6379/0"

    # App security — required; app will refuse to start if unset
    secret_key: str
    token_encryption_key: str
    cors_origins: str = "http://localhost:3000"
    frontend_url: str = "http://localhost:3000"

    # GitHub OAuth (filled in Phase 1)
    github_client_id: str = ""
    github_client_secret: str = ""
    github_oauth_redirect_uri: str = "http://localhost:8000/api/auth/github/callback"

    @field_validator("secret_key", "token_encryption_key")
    @classmethod
    def reject_placeholder_secrets(cls, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise ValueError("must be set via environment variable")
        if cleaned.lower().startswith("change-me"):
            raise ValueError(
                "placeholder value rejected — generate a real secret "
                "(e.g. `python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"` "
                "for TOKEN_ENCRYPTION_KEY)"
            )
        return cleaned

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def cookie_secure(self) -> bool:
        """Secure cookies for HTTPS deployments; off for local http://localhost."""
        return not self.frontend_url.startswith("http://localhost")


@lru_cache
def get_settings() -> Settings:
    return Settings()
