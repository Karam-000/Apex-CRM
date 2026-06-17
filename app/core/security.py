from __future__ import annotations

import hashlib
from dataclasses import dataclass

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

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


def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthContext:
    token = credentials.credentials
    token_hash = hash_token(token)
    row = (
        db.query(ApiCredential)
        .filter(ApiCredential.token_hash == token_hash, ApiCredential.is_active == 1)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or inactive token.")
    return AuthContext(user_id=row.user_id, role=row.role_name, team_id=row.team_id)


def ensure_roles(auth: AuthContext, allowed_roles: set[str]) -> None:
    if auth.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
