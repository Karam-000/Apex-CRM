"""Simple SMTP email sending.

Configure via environment variables (see .env.example):
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_USE_TLS

If SMTP is not configured, send_email returns a dry-run result so the app
still works locally without a mail server.
"""
from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core import config


def send_email(to: str, subject: str, body: str) -> dict:
    if not config.smtp_configured():
        return {"ok": False, "dry_run": True, "detail": "SMTP not configured; email logged but not sent."}

    message = EmailMessage()
    message["From"] = config.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as server:
            if config.SMTP_USE_TLS:
                server.starttls()
            if config.SMTP_USER:
                server.login(config.SMTP_USER, config.SMTP_PASSWORD or "")
            server.send_message(message)
        return {"ok": True, "dry_run": False}
    except Exception as exc:  # noqa: BLE001 - surface any SMTP error to the caller
        return {"ok": False, "dry_run": False, "error": str(exc)}
