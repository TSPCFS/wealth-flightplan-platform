"""Direct unit tests for service helpers (email + rate_limit + security)."""

from __future__ import annotations

import logging

import httpx
import pytest

from app.core.config import get_settings
from app.core.security import (
    PASSWORD_RULES,
    is_password_pwned,
    validate_password_strength,
)
from app.services import email as email_svc
from app.services import rate_limit

# ---------- Password validation ----------


def test_password_rules_string_exists() -> None:
    assert "12 characters" in PASSWORD_RULES


@pytest.mark.parametrize(
    "password,expect_error_substring",
    [
        ("short", "12 characters"),
        ("alllowercase123!", "uppercase"),
        ("ALLUPPERCASE123!", "lowercase"),
        ("NoDigitsHere!!!!", "digit"),
        ("NoSpecialChar123", "special"),
    ],
)
def test_validate_password_flags_specific_weaknesses(
    password: str, expect_error_substring: str
) -> None:
    errors = validate_password_strength(password)
    assert any(expect_error_substring in e.lower() for e in errors), errors


def test_validate_password_equals_email() -> None:
    errors = validate_password_strength("alice@example.com", email="alice@example.com")
    assert any("match your email" in e for e in errors)


# ---------- HIBP ----------


@pytest.mark.asyncio
async def test_is_password_pwned_returns_true_when_match(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import hashlib

    sha1 = hashlib.sha1(b"password").hexdigest().upper()
    suffix = sha1[5:]
    body = f"{suffix}:9999\nDEADBEEF:1\n"

    class _FakeResp:
        status_code = 200
        text = body

    class _FakeClient:
        def __init__(self, *_a, **_kw) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def get(self, *_a, **_kw):
            return _FakeResp()

    monkeypatch.setattr(httpx, "AsyncClient", _FakeClient)
    assert await is_password_pwned("password") is True


@pytest.mark.asyncio
async def test_is_password_pwned_returns_false_on_5xx(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class _FakeResp:
        status_code = 500
        text = ""

    class _FakeClient:
        def __init__(self, *_a, **_kw) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def get(self, *_a, **_kw):
            return _FakeResp()

    monkeypatch.setattr(httpx, "AsyncClient", _FakeClient)
    assert await is_password_pwned("SomeStrongP@ss12") is False


@pytest.mark.asyncio
async def test_is_password_pwned_fails_open_on_network_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class _FakeClient:
        def __init__(self, *_a, **_kw) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def get(self, *_a, **_kw):
            raise httpx.ConnectError("network unreachable")

    monkeypatch.setattr(httpx, "AsyncClient", _FakeClient)
    assert await is_password_pwned("SomeStrongP@ss12") is False


# ---------- Email service ----------


@pytest.mark.asyncio
async def test_email_falls_back_to_stdout_when_no_api_key(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Without RESEND_API_KEY the link is logged so dev can copy it."""
    caplog.set_level(logging.INFO, logger="app.services.email")
    await email_svc.send_verification_email(
        to_email="x@example.com",
        first_name="X",
        token="abc.def.ghi",
        settings=get_settings(),
    )
    msgs = "\n".join(r.message for r in caplog.records)
    assert "verify-email?token=abc.def.ghi" in msgs
    assert "RESEND_API_KEY" in msgs


@pytest.mark.asyncio
async def test_email_sends_via_resend_when_api_key_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With RESEND_API_KEY set, the Resend SDK is called with the right payload."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    get_settings.cache_clear()  # type: ignore[attr-defined]

    captured: list[dict] = []

    def fake_send(params: dict) -> dict:
        captured.append(params)
        return {"id": "stub-id"}

    import resend

    monkeypatch.setattr(resend.Emails, "send", staticmethod(fake_send))

    await email_svc.send_verification_email(
        to_email="real@example.com",
        first_name="Real",
        token="xyz",
        settings=get_settings(),
    )
    assert captured, "Resend SDK was not invoked"
    params = captured[-1]
    assert params["to"] == ["real@example.com"]
    assert "Verify" in params["subject"]
    assert "verify-email?token=xyz" in params["html"]
    assert "verify-email?token=xyz" in params["text"]
    assert "@" in params["from"]


@pytest.mark.asyncio
async def test_email_swallows_resend_errors(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """An exception from the Resend SDK must NOT crash the auth flow."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    get_settings.cache_clear()  # type: ignore[attr-defined]

    def boom(_params: dict) -> None:
        raise RuntimeError("simulated outage")

    import resend

    monkeypatch.setattr(resend.Emails, "send", staticmethod(boom))

    caplog.set_level(logging.ERROR, logger="app.services.email")
    await email_svc.send_password_reset_email(
        to_email="r@example.com",
        first_name="R",
        token="t",
        settings=get_settings(),
    )
    assert any("Failed to send email" in r.message for r in caplog.records)


# ---------- rate_limit module ----------


def test_parse_limit_strings() -> None:
    from app.services.rate_limit import _parse_limit

    assert _parse_limit("5/hour") == (5, 3600)
    assert _parse_limit("100/minute") == (100, 60)
    assert _parse_limit("1/second") == (1, 1)
    assert _parse_limit("10/day") == (10, 86_400)


def test_parse_limit_invalid_raises() -> None:
    from app.services.rate_limit import _parse_limit

    with pytest.raises(ValueError):
        _parse_limit("not-a-limit")


@pytest.mark.asyncio
async def test_rate_limit_enforce_blocks_after_threshold(redis_stub) -> None:
    """Verify enforce() trips after the configured count."""
    from app.core.errors import APIError

    for _ in range(3):
        await rate_limit.enforce(bucket="unit-test", key="alice@x.com", limit="3/hour")
    with pytest.raises(APIError) as exc:
        await rate_limit.enforce(bucket="unit-test", key="alice@x.com", limit="3/hour")
    assert exc.value.status_code == 429
    assert exc.value.headers and "Retry-After" in exc.value.headers
