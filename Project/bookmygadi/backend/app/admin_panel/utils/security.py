from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, Header, HTTPException, status
from jose import jwt, JWTError
from passlib.context import CryptContext
from pymongo.database import Database

from app.core.config import settings
from app.admin_panel.db.mongo import get_mongo_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


ALLOWED_ROLES = {"super_admin", "ops_admin", "support_agent", "finance_manager"}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_admin_token(admin: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(admin["_id"]),
        "email": admin.get("email"),
        "role": admin.get("role"),
        "exp": now + timedelta(minutes=settings.admin_access_token_expire_minutes),
        "iat": now,
        "scope": "admin",
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def _extract_bearer(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
    return parts[1]


def get_current_admin(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Database = Depends(get_mongo_db),
) -> dict[str, Any]:
    token = _extract_bearer(authorization)
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    if payload.get("scope") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token scope")

    admin = db["admins"].find_one({"email": payload.get("email")})
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account not found")
    if admin.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin account is not active")
    return admin


def require_roles(*roles: str):
    role_set = set(roles)

    def _checker(admin: dict[str, Any] = Depends(get_current_admin)) -> dict[str, Any]:
        if admin.get("role") not in role_set:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role not permitted")
        return admin

    return _checker
