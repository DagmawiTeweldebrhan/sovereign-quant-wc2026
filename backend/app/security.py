from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

AUTH_SECRET = os.getenv("AUTH_SECRET", "dev-secret-change-me")
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "720"))
security_scheme = HTTPBearer(auto_error=False)

current_user_context: ContextVar[Optional[Dict[str, Any]]] = ContextVar(
    "current_user_context",
    default=None,
)

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "WorldCup2026!")
DEFAULT_DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "admin@quant.local": {
        "user_id": "admin",
        "email": "admin@quant.local",
        "name": "Tournament Admin",
        "role": "admin",
        "team_iso": "N/A",
        "password": DEMO_PASSWORD,
    },
    "usa@quant.local": {
        "user_id": "usa_viewer",
        "email": "usa@quant.local",
        "name": "USA Scout",
        "role": "viewer",
        "team_iso": "USA",
        "password": DEMO_PASSWORD,
    },
    "mex@quant.local": {
        "user_id": "mex_viewer",
        "email": "mex@quant.local",
        "name": "Mexico Scout",
        "role": "viewer",
        "team_iso": "MEX",
        "password": DEMO_PASSWORD,
    },
    "bra@quant.local": {
        "user_id": "bra_viewer",
        "email": "bra@quant.local",
        "name": "Brazil Scout",
        "role": "viewer",
        "team_iso": "BRA",
        "password": DEMO_PASSWORD,
    },
    "fra@quant.local": {
        "user_id": "fra_viewer",
        "email": "fra@quant.local",
        "name": "France Scout",
        "role": "viewer",
        "team_iso": "FRA",
        "password": DEMO_PASSWORD,
    },
}

USER_REGISTRY: Dict[str, Dict[str, Any]] = {email: data.copy() for email, data in DEFAULT_DEMO_USERS.items()}


def _urlsafe_b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    salt = AUTH_SECRET.encode("utf-8")
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return _urlsafe_b64encode(digest)


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def _canonicalize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "team_iso": user.get("team_iso", "N/A"),
    }


def issue_access_token(user: Dict[str, Any]) -> str:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {
        "sub": user["email"].lower(),
        "user_id": user["user_id"],
        "email": user["email"].lower(),
        "name": user["name"],
        "role": user["role"],
        "team_iso": user.get("team_iso", "N/A"),
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    payload_raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_segment = _urlsafe_b64encode(payload_raw)
    signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        payload_segment.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{payload_segment}.{_urlsafe_b64encode(signature)}"


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload_segment, signature_segment = token.split(".", 1)
        expected_signature = hmac.new(
            AUTH_SECRET.encode("utf-8"),
            payload_segment.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        received_signature = _urlsafe_b64decode(signature_segment)
        if not hmac.compare_digest(expected_signature, received_signature):
            raise ValueError("signature_mismatch")
        payload = json.loads(_urlsafe_b64decode(payload_segment).decode("utf-8"))
        expires_at = int(payload.get("exp", 0))
        if expires_at <= int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("token_expired")
        return payload
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from exc


def set_current_user(user: Dict[str, Any]) -> None:
    current_user_context.set(user)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> Dict[str, Any]:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    payload = decode_access_token(credentials.credentials)
    user = {
        "user_id": payload["user_id"],
        "email": payload["email"],
        "name": payload["name"],
        "role": payload["role"],
        "team_iso": payload.get("team_iso", "N/A"),
    }
    set_current_user(user)
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> Dict[str, Any] | None:
    if credentials is None or not credentials.credentials:
        return None
    return get_current_user(credentials)


def get_user_from_registry(identifier: str) -> Dict[str, Any] | None:
    normalized = identifier.strip().lower()
    if not normalized:
        return None
    user = USER_REGISTRY.get(normalized)
    if user is not None:
        return user.copy()
    for candidate in USER_REGISTRY.values():
        if candidate["user_id"].lower() == normalized:
            return candidate.copy()
        if candidate["name"].lower() == normalized:
            return candidate.copy()
    return None


def register_user_in_registry(
    *,
    email: str,
    name: str,
    password: str,
    role: str = "viewer",
    team_iso: str = "N/A",
) -> Dict[str, Any]:
    normalized = email.strip().lower()
    if not normalized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required.")
    user = {
        "user_id": normalized.replace("@", "_").replace(".", "_"),
        "email": normalized,
        "name": name.strip() or normalized,
        "role": role,
        "team_iso": team_iso,
        "password": password,
        "password_hash": hash_password(password),
    }
    USER_REGISTRY[normalized] = user
    return user


def verify_registry_password(user: Dict[str, Any], password: str) -> bool:
    if user.get("password_hash"):
        return verify_password(password, user["password_hash"])
    return hmac.compare_digest(user.get("password", ""), password)
