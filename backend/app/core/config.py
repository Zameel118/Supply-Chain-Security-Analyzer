"""
App settings loaded from environment variables (.env / Docker Compose).
Change values in the project-root .env file — do not hardcode secrets here.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database & Redis
    database_url: str = (
        "postgresql+psycopg://scsa:scsa_dev_password@localhost:5432/supply_chain_analyzer"
    )
    redis_url: str = "redis://localhost:6379/0"

    # App security
    secret_key: str = "change-me-to-a-long-random-string"
    token_encryption_key: str = "change-me-to-a-32-byte-url-safe-base64-key"
    cors_origins: str = "http://localhost:3000"
    frontend_url: str = "http://localhost:3000"

    # GitHub OAuth (filled in Phase 1)
    github_client_id: str = ""
    github_client_secret: str = ""
    github_oauth_redirect_uri: str = "http://localhost:8000/api/auth/github/callback"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
