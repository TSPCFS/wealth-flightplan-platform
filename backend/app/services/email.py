"""Email service.

When SENDGRID_API_KEY is set, mail is sent via the SendGrid v3 API.
Otherwise the email body + verification/reset link is logged to stdout so
local dev works without external dependencies.
"""

from __future__ import annotations

import logging

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send"


def _verification_link(settings: Settings, token: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/verify-email?token={token}"


def _reset_link(settings: Settings, token: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"


def _verification_html(name: str, link: str) -> str:
    return (
        f"<p>Hi {name},</p>"
        f"<p>Welcome to Wealth FlightPlan! Please confirm your email by clicking the link below:</p>"
        f'<p><a href="{link}">Verify my email</a></p>'
        f"<p>This link expires in 24 hours.</p>"
    )


def _reset_html(name: str, link: str) -> str:
    return (
        f"<p>Hi {name},</p>"
        f"<p>We received a request to reset your Wealth FlightPlan password.</p>"
        f'<p><a href="{link}">Reset my password</a></p>'
        f"<p>If you didn't request this, you can safely ignore this email. "
        f"The link expires in 1 hour.</p>"
    )


async def _send_via_sendgrid(
    settings: Settings,
    *,
    to_email: str,
    subject: str,
    html: str,
) -> None:
    payload = {
        "personalizations": [{"to": [{"email": to_email}], "subject": subject}],
        "from": {"email": settings.email_from, "name": settings.email_from_name},
        "content": [{"type": "text/html", "value": html}],
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            SENDGRID_URL,
            headers={
                "Authorization": f"Bearer {settings.sendgrid_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code >= 400:
            logger.error("SendGrid send failed: status=%s body=%s", r.status_code, r.text[:300])
            r.raise_for_status()


def _log_email(*, to: str, subject: str, link: str) -> None:
    logger.info(
        "EMAIL (dev — no SENDGRID_API_KEY)\n  to: %s\n  subject: %s\n  link: %s",
        to,
        subject,
        link,
    )


async def send_verification_email(
    *,
    to_email: str,
    first_name: str,
    token: str,
    settings: Settings | None = None,
) -> None:
    settings = settings or get_settings()
    link = _verification_link(settings, token)
    subject = "Verify your Wealth FlightPlan account"
    if not settings.sendgrid_api_key:
        _log_email(to=to_email, subject=subject, link=link)
        return
    try:
        await _send_via_sendgrid(
            settings,
            to_email=to_email,
            subject=subject,
            html=_verification_html(first_name, link),
        )
    except Exception as e:
        logger.exception("Failed to send verification email to %s: %s", to_email, e)
        # Don't surface to caller — verification can be re-requested.


async def send_password_reset_email(
    *,
    to_email: str,
    first_name: str,
    token: str,
    settings: Settings | None = None,
) -> None:
    settings = settings or get_settings()
    link = _reset_link(settings, token)
    subject = "Reset your Wealth FlightPlan password"
    if not settings.sendgrid_api_key:
        _log_email(to=to_email, subject=subject, link=link)
        return
    try:
        await _send_via_sendgrid(
            settings,
            to_email=to_email,
            subject=subject,
            html=_reset_html(first_name, link),
        )
    except Exception as e:
        logger.exception("Failed to send password reset email to %s: %s", to_email, e)
