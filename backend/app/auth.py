from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import (
    get_current_user,
    get_current_user_optional,
    get_user_from_registry,
    issue_access_token,
    register_user_in_registry,
    verify_registry_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthLoginSchema(BaseModel):
    email: str | None = Field(default=None, min_length=3)
    username: str | None = Field(default=None, min_length=3)
    identifier: str | None = Field(default=None, min_length=3)
    password: str = Field(..., min_length=1)

    def resolved_identity(self) -> str:
        for candidate in (self.email, self.username, self.identifier):
            if candidate and candidate.strip():
                return candidate.strip()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username is required.",
        )


class AuthRegisterSchema(BaseModel):
    email: str = Field(..., min_length=3)
    name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=8)
    role: str = Field(default="viewer", pattern="^(admin|viewer)$")
    team_iso: str = Field(default="N/A", min_length=3, max_length=3)


class AuthUserSchema(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    team_iso: str


class AuthSessionSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserSchema


def _build_session(user: Dict[str, Any]) -> AuthSessionSchema:
    canonical = {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "team_iso": user.get("team_iso", "N/A"),
    }
    return AuthSessionSchema(
        access_token=issue_access_token(canonical),
        user=AuthUserSchema(**canonical),
    )


@router.post("/register", response_model=AuthSessionSchema)
async def register(payload: AuthRegisterSchema, db: Session = Depends(get_db)) -> AuthSessionSchema:
    del db
    try:
        existing = get_user_from_registry(payload.email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Account already exists.",
            )
        created = register_user_in_registry(
            email=payload.email,
            name=payload.name,
            password=payload.password,
            role=payload.role,
            team_iso=payload.team_iso,
        )
        return _build_session(created)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        ) from exc


@router.post("/login", response_model=AuthSessionSchema)
async def login(payload: AuthLoginSchema, db: Session = Depends(get_db)) -> AuthSessionSchema:
    del db
    try:
        identity = payload.resolved_identity().lower()
        user = get_user_from_registry(identity)
        if user is None and "@" not in identity:
            user = get_user_from_registry(f"{identity}@quant.local")

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not verify_registry_password(user, payload.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        return _build_session(user)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        ) from exc


@router.get("/me", response_model=AuthUserSchema)
async def me(current_user: Dict[str, Any] = Depends(get_current_user)) -> AuthUserSchema:
    return AuthUserSchema(**current_user)


@router.get("/session", response_model=AuthUserSchema | None)
async def session(current_user: Dict[str, Any] | None = Depends(get_current_user_optional)) -> AuthUserSchema | None:
    if current_user is None:
        return None
    return AuthUserSchema(**current_user)
