from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core import config
from app.core.db import get_db
from app.models.entities import ApiCredential

bearer_scheme = HTTPBearer(auto_error=True)


def hash_token(token: str) -> str:
    """Deterministic SHA-256 hash, used for API-token lookup (must be queryable)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    """Salted bcrypt hash for user passwords."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, stored_hash: str | None) -> bool:
    """Verify a password against a bcrypt hash, with fallback for legacy SHA-256 hashes."""
    if not stored_hash:
        return False
    if stored_hash.startswith("$2"):  # bcrypt hashes start with $2a/$2b/$2y
        try:
            return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
        except ValueError:
            return False
    # Legacy: pre-bcrypt SHA-256 hash.
    return hash_token(password) == stored_hash


def is_legacy_hash(stored_hash: str | None) -> bool:
    return bool(stored_hash) and not stored_hash.startswith("$2")


@dataclass
class AuthContext:
    user_id: int
    role: str
    team_id: int | None


def create_access_token(user_id: int, role: str, team_id: int | None) -> str:
    """Issue a signed, expiring JWT access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "team_id": team_id,
        "type": "access",
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + timedelta(minutes=config.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def _auth_from_jwt(token: str) -> AuthContext | None:
    """Return AuthContext if the token is a valid (non-expired) JWT, else None.

    Raises 401 only when the token *is* a JWT but is expired/tampered, so callers
    get a clear error instead of silently falling back.
    """
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired.")
    except jwt.InvalidTokenError:
        return None  # Not a JWT we issued — try the legacy lookup instead.
    return AuthContext(
        user_id=int(payload["sub"]),
        role=payload.get("role", "agent"),
        team_id=payload.get("team_id"),
    )


def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthContext:
    token = credentials.credentials
    # 1) Preferred: signed JWT access token.
    auth = _auth_from_jwt(token)
    if auth is not None:
        return auth
    # 2) Fallback: legacy/static API token looked up by hash (e.g. connector keys).
    row = (
        db.query(ApiCredential)
        .filter(ApiCredential.token_hash == hash_token(token), ApiCredential.is_active == 1)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or inactive token.")
    return AuthContext(user_id=row.user_id, role=row.role_name, team_id=row.team_id)


def ensure_roles(auth: AuthContext, allowed_roles: set[str]) -> None:
    if auth.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
