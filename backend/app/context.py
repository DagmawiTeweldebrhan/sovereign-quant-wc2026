from __future__ import annotations

from contextvars import ContextVar

from app.api.validation import AuthenticatedUserSchema

current_user_context: ContextVar[AuthenticatedUserSchema | None] = ContextVar(
    "current_user_context",
    default=None,
)

