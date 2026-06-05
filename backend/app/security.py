from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass

from app.config import get_settings

settings = get_settings()
_PBKDF2_ITERATIONS = 310_000


@dataclass(frozen=True)
class TokenClaims:
    user_id: str
    email: str
    display_name: str
    role: str
    team_iso: str | None
    exp: int


def _b64url_encode(raw_bytes: bytes) -> str:
    return base64.urlsafe_b64encode(raw_bytes).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        _PBKDF2_ITERATIONS,
    )
    return "pbkdf2_sha256$%d$%s$%s" % (
        _PBKDF2_ITERATIONS,
        _b64url_encode(salt_bytes),
        _b64url_encode(derived_key),
    )


def verify_password(password: str, stored_password_hash: str) -> bool:
    try:
        algorithm, iterations, salt_value, hash_value = stored_password_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt_bytes = _b64url_decode(salt_value)
        expected_hash = _b64url_decode(hash_value)
        recalculated_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt_bytes,
            int(iterations),
        )
        return hmac.compare_digest(expected_hash, recalculated_hash)
    except Exception:
        return False


def create_access_token(
    *,
    user_id: str,
    email: str,
    display_name: str,
    role: str,
    team_iso: str | None,
) -> str:
    expires_at = int(time.time()) + settings.access_token_ttl_hours * 3600
    claims = {
        "user_id": user_id,
        "email": email,
        "display_name": display_name,
        "role": role,
        "team_iso": team_iso,
        "exp": expires_at,
    }
    payload = json.dumps(claims, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_segment = _b64url_encode(payload)
    signature = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        payload_segment.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{payload_segment}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> TokenClaims:
    try:
        payload_segment, signature_segment = token.split(".", 1)
        expected_signature = hmac.new(
            settings.auth_secret_key.encode("utf-8"),
            payload_segment.encode("ascii"),
            hashlib.sha256,
        ).digest()
        provided_signature = _b64url_decode(signature_segment)
        if not hmac.compare_digest(expected_signature, provided_signature):
            raise ValueError("Token signature mismatch")

        payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
        if int(payload["exp"]) < int(time.time()):
            raise ValueError("Token expired")
        return TokenClaims(
            user_id=str(payload["user_id"]),
            email=str(payload["email"]),
            display_name=str(payload["display_name"]),
            role=str(payload["role"]),
            team_iso=payload.get("team_iso"),
            exp=int(payload["exp"]),
        )
    except Exception as error:
        raise ValueError("Invalid access token") from error

