"""Application configuration loaded from environment variables (and an optional .env file)."""
from __future__ import annotations

import os

try:  # Load a local .env file if python-dotenv is installed.
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # noqa: BLE001 - dotenv is optional
    pass


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


# --- SMTP / outbound email settings -----------------------------------------
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM") or SMTP_USER
SMTP_USE_TLS = _as_bool(os.getenv("SMTP_USE_TLS"), default=True)


def smtp_configured() -> bool:
    """True when enough SMTP settings are present to attempt a real send."""
    return bool(SMTP_HOST and SMTP_FROM)


# --- JWT / authentication settings ------------------------------------------
# Set JWT_SECRET in .env for production. The default is for local dev only.
JWT_SECRET = os.getenv("JWT_SECRET", "dev-insecure-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8 hours

if JWT_SECRET == "dev-insecure-change-me":
    print("[WARN] JWT_SECRET is using the insecure default. Set JWT_SECRET in .env for production.")
