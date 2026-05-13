"""Password hashing, JWT (RS256) encode/decode."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import Settings, get_settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------- Password hashing ----------


def hash_password(plain: str) -> str:
    # bcrypt has a 72-byte limit; pre-hash longer inputs deterministically.
    if len(plain.encode("utf-8")) > 72:
        plain = hashlib.sha256(plain.encode("utf-8")).hexdigest()
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    if len(plain.encode("utf-8")) > 72:
        plain = hashlib.sha256(plain.encode("utf-8")).hexdigest()
    try:
        return _pwd_context.verify(plain, hashed)
    except ValueError:
        return False


# ---------- Password strength + breach check ----------

PASSWORD_RULES = (
    "Password must be at least 12 characters long and include upper- and lower-case "
    "letters, a digit, and a special character. It must not match your email and must "
    "not appear in any known data breach."
)


def validate_password_strength(password: str, *, email: str | None = None) -> list[str]:
    errors: list[str] = []
    if len(password) < 12:
        errors.append("Password must be at least 12 characters long.")
    if not any(c.islower() for c in password):
        errors.append("Password must contain a lowercase letter.")
    if not any(c.isupper() for c in password):
        errors.append("Password must contain an uppercase letter.")
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain a digit.")
    if not any(not c.isalnum() for c in password):
        errors.append("Password must contain a special character.")
    if email and password.strip().lower() == email.strip().lower():
        errors.append("Password must not match your email address.")
    return errors


async def is_password_pwned(password: str, *, timeout: float = 2.0) -> bool:
    """HaveIBeenPwned k-anonymity check. Returns True if breached.

    Network failures are treated as 'not breached' (fail-open) so the check
    cannot lock out registrations during HIBP downtime.
    """
    sha1 = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                headers={"Add-Padding": "true"},
            )
            if r.status_code != 200:
                return False
            for line in r.text.splitlines():
                hash_suffix, _, _count = line.partition(":")
                if hash_suffix.strip() == suffix:
                    return True
    except (httpx.HTTPError, httpx.TimeoutException):
        return False
    return False


# ---------- JWT (RS256) ----------

_PRIVATE_KEY_CACHE: str | None = None
_PUBLIC_KEY_CACHE: str | None = None


def _normalise_pem(raw: str) -> str:
    """Convert escaped \\n sequences to real newlines.

    Hosting platforms (Railway, Render, Fly, etc.) often pipe env vars as
    single-line strings; an operator pasting a PEM via CLI / dotenv typically
    ends up with literal ``\\n`` instead of newlines. PyJWT/jose require real
    newlines to parse the key, so normalise here. PEMs pasted through web
    dashboards usually preserve newlines and pass through unchanged.
    """
    if "\\n" in raw and "\n" not in raw:
        return raw.replace("\\n", "\n")
    return raw


def _load_key(path_or_inline: Path | None, inline: str | None, kind: str) -> str:
    # Inline env var takes priority: preferred path for production.
    if inline:
        return _normalise_pem(inline)
    if path_or_inline is None:
        raise RuntimeError(f"JWT {kind} key not configured")
    p = Path(path_or_inline)
    if not p.is_absolute():
        # Resolve relative to backend/
        p = (Path(__file__).resolve().parents[2] / p).resolve()
    if not p.exists():
        raise RuntimeError(f"JWT {kind} key not found at {p}")
    return p.read_text()


def _get_private_key(settings: Settings) -> str:
    global _PRIVATE_KEY_CACHE
    if _PRIVATE_KEY_CACHE is None:
        _PRIVATE_KEY_CACHE = _load_key(
            settings.jwt_private_key_path, settings.jwt_private_key, "private"
        )
    return _PRIVATE_KEY_CACHE


def _get_public_key(settings: Settings) -> str:
    global _PUBLIC_KEY_CACHE
    if _PUBLIC_KEY_CACHE is None:
        _PUBLIC_KEY_CACHE = _load_key(
            settings.jwt_public_key_path, settings.jwt_public_key, "public"
        )
    return _PUBLIC_KEY_CACHE


def reset_key_cache() -> None:
    """For tests: force keys to be re-read after settings change."""
    global _PRIVATE_KEY_CACHE, _PUBLIC_KEY_CACHE
    _PRIVATE_KEY_CACHE = None
    _PUBLIC_KEY_CACHE = None


class TokenType:
    ACCESS = "access"
    REFRESH = "refresh"
    VERIFY = "email_verify"
    RESET = "password_reset"


def _now() -> datetime:
    return datetime.now(UTC)


def encode_token(
    *,
    subject: str,
    token_type: str,
    expires_in: int,
    extra_claims: dict[str, Any] | None = None,
    settings: Settings | None = None,
) -> tuple[str, str]:
    """Returns (jwt, jti)."""
    settings = settings or get_settings()
    now = _now()
    jti = uuid.uuid4().hex
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
        "iss": settings.jwt_issuer,
        "jti": jti,
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(
        payload,
        _get_private_key(settings),
        algorithm=settings.jwt_algorithm,
    )
    return token, jti


def decode_token(
    token: str,
    *,
    expected_type: str | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Decode + verify a JWT. Raises ``JWTError`` on invalid/expired."""
    settings = settings or get_settings()
    payload = jwt.decode(
        token,
        _get_public_key(settings),
        algorithms=[settings.jwt_algorithm],
        issuer=settings.jwt_issuer,
    )
    if expected_type and payload.get("type") != expected_type:
        raise JWTError(f"Expected token type {expected_type}, got {payload.get('type')}")
    return payload


def generate_url_safe_token(n_bytes: int = 32) -> str:
    return secrets.token_urlsafe(n_bytes)


__all__ = [
    "PASSWORD_RULES",
    "TokenType",
    "decode_token",
    "encode_token",
    "generate_url_safe_token",
    "hash_password",
    "is_password_pwned",
    "reset_key_cache",
    "validate_password_strength",
    "verify_password",
]
