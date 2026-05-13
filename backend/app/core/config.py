from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    environment: Literal["development", "test", "staging", "production"] = "development"
    log_level: str = "INFO"
    frontend_url: str = "http://localhost:5173"

    # Database
    database_url: str = (
        "postgresql+asyncpg://wealth_user:dev_password@localhost:5432/wealthflightplan"
    )

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_private_key_path: Path = Path("./keys/jwt_private.pem")
    jwt_public_key_path: Path = Path("./keys/jwt_public.pem")
    jwt_access_token_expire_seconds: int = 3600
    jwt_refresh_token_expire_seconds: int = 2_592_000
    jwt_verification_token_expire_seconds: int = 86_400
    jwt_reset_token_expire_seconds: int = 3_600
    jwt_issuer: str = "wealthflightplan"
    jwt_algorithm: Literal["RS256"] = "RS256"

    # Inline overrides used by tests (kept optional so prod loads from files)
    jwt_private_key: str | None = None
    jwt_public_key: str | None = None

    # CORS
    cors_allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # Email (Resend). ``sendgrid_api_key`` is retained as a deprecated alias for
    # backwards-compat: read but never preferred. Empty key → stdout fallback.
    resend_api_key: str = ""
    sendgrid_api_key: str = ""  # deprecated; ignored if resend_api_key is set
    # ``onboarding@resend.dev`` lets the platform send mail without a verified
    # domain; Resend allow-list their own subdomain for dev/testing.
    email_from: str = "onboarding@resend.dev"
    email_from_name: str = "Wealth FlightPlan"

    # HIBP
    hibp_enabled: bool = True
    hibp_timeout_seconds: float = 2.0

    # Rate limits
    rate_limit_register: str = "5/hour"
    rate_limit_login: str = "10/hour"
    rate_limit_password_reset: str = "3/hour"
    rate_limit_authed: str = "100/minute"

    # Test-only flag: skip live Redis / DB / outbound network when set.
    testing: bool = Field(default=False)

    @field_validator("cors_allowed_origins")
    @classmethod
    def _strip_trailing(cls, v: str) -> str:
        return v.strip()

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
