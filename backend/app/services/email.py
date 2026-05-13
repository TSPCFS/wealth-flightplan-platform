"""Email service: Resend HTTP API with a dev-stdout fallback.

When ``RESEND_API_KEY`` is set, mail is sent via the official ``resend``
SDK. Otherwise the email body + verification/reset link is logged to stdout
so local dev (and CI) works without any external dependency.

Send failures are deliberately *swallowed*: verification + password reset
links can always be re-requested, so a transient email outage must never
fail the user-facing auth flow.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import resend

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

BRAND = "Wealth FlightPlan"


# ---------------------------------------------------------------------------
# Link composition
# ---------------------------------------------------------------------------


def _verification_link(settings: Settings, token: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/verify-email?token={token}"


def _reset_link(settings: Settings, token: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"


# ---------------------------------------------------------------------------
# HTML + plain-text templates
# ---------------------------------------------------------------------------


_BUTTON_STYLE = (
    "display:inline-block;padding:12px 20px;background:#1f7a3a;color:#ffffff;"
    "border-radius:4px;text-decoration:none;font-weight:600;"
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
)
_BODY_STYLE = (
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"
    "font-size:15px;line-height:1.5;color:#222222"
)


def _wrap_html(body: str) -> str:
    return (
        f'<div style="{_BODY_STYLE};max-width:560px;margin:auto;padding:24px">'
        f'<h2 style="margin-top:0;color:#1f7a3a">{BRAND}</h2>'
        f"{body}"
        f'<p style="margin-top:32px;color:#888888;font-size:13px">'
        f"Illustrative. Not financial advice. Verify with a qualified advisor."
        f"</p></div>"
    )


def _verification_html(first_name: str, link: str) -> str:
    body = (
        f"<p>Hi {first_name},</p>"
        f"<p>Welcome to {BRAND}! Confirm your email to unlock the dashboard:</p>"
        f'<p style="margin:24px 0"><a href="{link}" style="{_BUTTON_STYLE}">Verify my email</a></p>'
        f'<p style="color:#666666">Or paste this link in your browser:<br>'
        f'<a href="{link}">{link}</a></p>'
        f"<p>This link expires in 24 hours.</p>"
    )
    return _wrap_html(body)


def _verification_text(first_name: str, link: str) -> str:
    return (
        f"Hi {first_name},\n\n"
        f"Welcome to {BRAND}. Confirm your email to unlock the dashboard:\n\n"
        f"{link}\n\n"
        f"This link expires in 24 hours.\n\n"
        f"– {BRAND}"
    )


def _reset_html(first_name: str, link: str) -> str:
    body = (
        f"<p>Hi {first_name},</p>"
        f"<p>We received a request to reset your {BRAND} password. Click the button below to choose a new one:</p>"
        f'<p style="margin:24px 0"><a href="{link}" style="{_BUTTON_STYLE}">Reset my password</a></p>'
        f'<p style="color:#666666">Or paste this link in your browser:<br>'
        f'<a href="{link}">{link}</a></p>'
        f"<p>If you didn't request this, you can safely ignore this email. "
        f"The link expires in 1 hour.</p>"
    )
    return _wrap_html(body)


def _reset_text(first_name: str, link: str) -> str:
    return (
        f"Hi {first_name},\n\n"
        f"We received a request to reset your {BRAND} password. "
        f"Visit this link to choose a new one:\n\n"
        f"{link}\n\n"
        f"If you didn't request this, you can safely ignore this email. "
        f"The link expires in 1 hour.\n\n"
        f"– {BRAND}"
    )


# ---------------------------------------------------------------------------
# Send
# ---------------------------------------------------------------------------


def _from_field(settings: Settings) -> str:
    """Resend accepts either a plain email or ``Name <email>`` form."""
    if settings.email_from_name:
        return f"{settings.email_from_name} <{settings.email_from}>"
    return settings.email_from


def _send_via_resend(
    settings: Settings,
    *,
    to_email: str,
    subject: str,
    html: str,
    text: str,
) -> dict[str, Any]:
    """Synchronous Resend send: wrapped in ``asyncio.to_thread`` at the call site."""
    resend.api_key = settings.resend_api_key
    params: dict[str, Any] = {
        "from": _from_field(settings),
        "to": [to_email],
        "subject": subject,
        "html": html,
        "text": text,
    }
    return resend.Emails.send(params)


def _log_email(*, to: str, subject: str, link: str) -> None:
    logger.info(
        "EMAIL (dev, no RESEND_API_KEY)\n  to: %s\n  subject: %s\n  link: %s",
        to,
        subject,
        link,
    )


async def _send_or_log(
    settings: Settings,
    *,
    to_email: str,
    subject: str,
    link: str,
    html: str,
    text: str,
) -> None:
    if not settings.resend_api_key:
        _log_email(to=to_email, subject=subject, link=link)
        return
    try:
        await asyncio.to_thread(
            _send_via_resend,
            settings,
            to_email=to_email,
            subject=subject,
            html=html,
            text=text,
        )
    except Exception as exc:
        # Never block the caller; verification + reset can be re-requested.
        logger.exception("Failed to send email to %s: %s", to_email, exc)


# ---------------------------------------------------------------------------
# Public API (unchanged signatures)
# ---------------------------------------------------------------------------


async def send_verification_email(
    *,
    to_email: str,
    first_name: str,
    token: str,
    settings: Settings | None = None,
) -> None:
    settings = settings or get_settings()
    link = _verification_link(settings, token)
    subject = f"Verify your {BRAND} account"
    await _send_or_log(
        settings,
        to_email=to_email,
        subject=subject,
        link=link,
        html=_verification_html(first_name, link),
        text=_verification_text(first_name, link),
    )


async def send_password_reset_email(
    *,
    to_email: str,
    first_name: str,
    token: str,
    settings: Settings | None = None,
) -> None:
    settings = settings or get_settings()
    link = _reset_link(settings, token)
    subject = f"Reset your {BRAND} password"
    await _send_or_log(
        settings,
        to_email=to_email,
        subject=subject,
        link=link,
        html=_reset_html(first_name, link),
        text=_reset_text(first_name, link),
    )


__all__ = ["send_password_reset_email", "send_verification_email"]
