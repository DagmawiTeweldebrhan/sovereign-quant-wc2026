from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlmodel import Session

from app.api.validation import (
    AuthLoginSchema,
    AuthRegisterSchema,
    AuthSessionSchema,
    AuthenticatedUserSchema,
)
from app.config import get_settings
from app.context import current_user_context
from app.database import engine
from app.models.schemas import AuthUser
from app.security import create_access_token, decode_access_token, hash_password, verify_password

settings = get_settings()
auth_router = APIRouter(prefix="/auth", tags=["auth"])
security_scheme = HTTPBearer(auto_error=False)


def _to_authenticated_user(user: AuthUser) -> AuthenticatedUserSchema:
    return AuthenticatedUserSchema(
        user_id=user.user_id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        team_iso=user.team_iso,
        is_active=user.is_active,
    )


def _get_user_by_email(session: Session, email: str) -> AuthUser | None:
    statement = select(AuthUser).where(AuthUser.email == email)
    return session.exec(statement).first()


def _get_user_by_id(session: Session, user_id: str) -> AuthUser | None:
    return session.get(AuthUser, user_id)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
) -> AuthenticatedUserSchema:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = decode_access_token(credentials.credentials)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    with Session(engine) as session:
        user = _get_user_by_id(session, claims.user_id)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is unavailable",
                headers={"WWW-Authenticate": "Bearer"},
            )
        authenticated_user = _to_authenticated_user(user)
        current_user_context.set(authenticated_user)
        return authenticated_user


def require_admin_user() -> AuthenticatedUserSchema:
    user = current_user_context.get()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


@auth_router.post("/register", response_model=AuthSessionSchema, status_code=status.HTTP_201_CREATED)
def register_user(payload: AuthRegisterSchema) -> AuthSessionSchema:
    with Session(engine) as session:
        if _get_user_by_email(session, payload.email) is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = AuthUser(
            user_id=f"user_{payload.email.lower().replace('@', '_').replace('.', '_')}",
            email=payload.email.lower(),
            password_hash=hash_password(payload.password),
            display_name=payload.display_name,
            role="viewer",
            team_iso=payload.team_iso,
            is_active=True,
            created_at=datetime.utcnow(),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        return AuthSessionSchema(
            access_token=create_access_token(
                user_id=user.user_id,
                email=user.email,
                display_name=user.display_name,
                role=user.role,
                team_iso=user.team_iso,
            ),
            user=_to_authenticated_user(user),
        )


@auth_router.post("/login", response_model=AuthSessionSchema)
def login_user(payload: AuthLoginSchema) -> AuthSessionSchema:
    with Session(engine) as session:
        user = _get_user_by_email(session, payload.email.lower())
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

        return AuthSessionSchema(
            access_token=create_access_token(
                user_id=user.user_id,
                email=user.email,
                display_name=user.display_name,
                role=user.role,
                team_iso=user.team_iso,
            ),
            user=_to_authenticated_user(user),
        )


@auth_router.get("/me", response_model=AuthenticatedUserSchema)
def read_current_user(user: Annotated[AuthenticatedUserSchema, Depends(get_current_user)]) -> AuthenticatedUserSchema:
    return user
