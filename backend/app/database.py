from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Dict, Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.security import current_user_context

PRIMARY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://quant_operator:structural_password_secure_992@database:5432/worldcup_quant_2026",
)
FALLBACK_DATABASE_URL = os.getenv("FALLBACK_DATABASE_URL", "sqlite:///./worldcup_quant_2026.db")


def _build_engine(database_url: str) -> Engine:
    connect_args: Dict[str, Any] = {}
    if database_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    return create_engine(
        database_url,
        future=True,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args=connect_args,
    )


def _resolve_engine() -> Engine:
    try:
        engine = _build_engine(PRIMARY_DATABASE_URL)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return engine
    except Exception:  # noqa: BLE001
        return _build_engine(FALLBACK_DATABASE_URL)


engine = _resolve_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    database = SessionLocal()
    try:
        yield database
        database.commit()
    except Exception:
        database.rollback()
        raise
    finally:
        database.close()


@contextmanager
def authorized_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    current_user = current_user_context.get() or {}
    try:
        role = str(current_user.get("role", "viewer")).lower()
        user_id = str(current_user.get("user_id", "anonymous"))
        team_iso = str(current_user.get("team_iso", "N/A"))

        if engine.dialect.name == "postgresql":
            session.execute(text("SELECT set_config('app.user_id', :user_id, true)"), {"user_id": user_id})
            session.execute(text("SELECT set_config('app.role', :role, true)"), {"role": role})
            session.execute(text("SELECT set_config('app.team_iso', :team_iso, true)"), {"team_iso": team_iso})
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def apply_postgres_row_level_security() -> None:
    if engine.dialect.name != "postgresql":
        return
    statements = [
        "ALTER TABLE venues ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE teams ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE managers ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE player_metrics_2026 ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE simulation_outputs ENABLE ROW LEVEL SECURITY",
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venues' AND policyname='viewer_venues_select') THEN
                CREATE POLICY viewer_venues_select ON venues FOR SELECT USING (true);
            END IF;
        END $$;
        """,
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
