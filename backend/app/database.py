from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session, SQLModel

from app.config import get_settings
from app.context import current_user_context

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, echo=False, future=True, connect_args=connect_args)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def apply_postgres_row_level_security() -> None:
    if not settings.database_url.startswith("postgresql"):
        return

    policy_statements = [
        "ALTER TABLE venues ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE venues FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS venues_authenticated_read ON venues",
        """
        CREATE POLICY venues_authenticated_read ON venues
        FOR SELECT
        USING (current_setting('app.user_id', true) IS NOT NULL)
        """,
        "DROP POLICY IF EXISTS venues_admin_write ON venues",
        """
        CREATE POLICY venues_admin_write ON venues
        FOR ALL
        USING (current_setting('app.role', true) = 'admin')
        WITH CHECK (current_setting('app.role', true) = 'admin')
        """,
        "ALTER TABLE teams ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE teams FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS teams_authenticated_read ON teams",
        """
        CREATE POLICY teams_authenticated_read ON teams
        FOR SELECT
        USING (current_setting('app.user_id', true) IS NOT NULL)
        """,
        "DROP POLICY IF EXISTS teams_admin_write ON teams",
        """
        CREATE POLICY teams_admin_write ON teams
        FOR ALL
        USING (current_setting('app.role', true) = 'admin')
        WITH CHECK (current_setting('app.role', true) = 'admin')
        """,
        "ALTER TABLE managers ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE managers FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS managers_authenticated_read ON managers",
        """
        CREATE POLICY managers_authenticated_read ON managers
        FOR SELECT
        USING (current_setting('app.user_id', true) IS NOT NULL)
        """,
        "DROP POLICY IF EXISTS managers_admin_write ON managers",
        """
        CREATE POLICY managers_admin_write ON managers
        FOR ALL
        USING (current_setting('app.role', true) = 'admin')
        WITH CHECK (current_setting('app.role', true) = 'admin')
        """,
        "ALTER TABLE player_metrics_2026 ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE player_metrics_2026 FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS player_metrics_scoped_read ON player_metrics_2026",
        """
        CREATE POLICY player_metrics_scoped_read ON player_metrics_2026
        FOR SELECT
        USING (
            current_setting('app.role', true) IN ('admin', 'system')
            OR team_iso = current_setting('app.team_iso', true)
        )
        """,
        "DROP POLICY IF EXISTS player_metrics_admin_write ON player_metrics_2026",
        """
        CREATE POLICY player_metrics_admin_write ON player_metrics_2026
        FOR ALL
        USING (current_setting('app.role', true) = 'admin')
        WITH CHECK (current_setting('app.role', true) = 'admin')
        """,
        "ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE travel_logs FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS travel_logs_scoped_read ON travel_logs",
        """
        CREATE POLICY travel_logs_scoped_read ON travel_logs
        FOR SELECT
        USING (
            current_setting('app.role', true) IN ('admin', 'system')
            OR team_iso = current_setting('app.team_iso', true)
        )
        """,
        "DROP POLICY IF EXISTS travel_logs_admin_write ON travel_logs",
        """
        CREATE POLICY travel_logs_admin_write ON travel_logs
        FOR ALL
        USING (current_setting('app.role', true) = 'admin')
        WITH CHECK (current_setting('app.role', true) = 'admin')
        """,
        "ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE fixtures FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS fixtures_scoped_read ON fixtures",
        """
        CREATE POLICY fixtures_scoped_read ON fixtures
        FOR SELECT
        USING (
            current_setting('app.role', true) IN ('admin', 'system')
            OR home_team_iso = current_setting('app.team_iso', true)
            OR away_team_iso = current_setting('app.team_iso', true)
        )
        """,
        "DROP POLICY IF EXISTS fixtures_admin_write ON fixtures",
        """
        CREATE POLICY fixtures_admin_write ON fixtures
        FOR ALL
        USING (current_setting('app.role', true) = 'admin')
        WITH CHECK (current_setting('app.role', true) = 'admin')
        """,
        "ALTER TABLE simulation_outputs ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE simulation_outputs FORCE ROW LEVEL SECURITY",
        "DROP POLICY IF EXISTS simulation_outputs_scoped_read ON simulation_outputs",
        """
        CREATE POLICY simulation_outputs_scoped_read ON simulation_outputs
        FOR SELECT
        USING (
            current_setting('app.role', true) IN ('admin', 'system')
            OR EXISTS (
                SELECT 1
                FROM fixtures f
                WHERE f.fixture_id = simulation_outputs.fixture_id
                  AND (
                    f.home_team_iso = current_setting('app.team_iso', true)
                    OR f.away_team_iso = current_setting('app.team_iso', true)
                  )
            )
        )
        """,
        "DROP POLICY IF EXISTS simulation_outputs_system_write ON simulation_outputs",
        """
        CREATE POLICY simulation_outputs_system_write ON simulation_outputs
        FOR ALL
        USING (current_setting('app.role', true) IN ('admin', 'system'))
        WITH CHECK (current_setting('app.role', true) IN ('admin', 'system'))
        """,
    ]

    with engine.begin() as connection:
        for statement in policy_statements:
            connection.exec_driver_sql(statement)


@contextmanager
def authorized_session(role_override: str | None = None) -> Generator[Session, None, None]:
    user = current_user_context.get()
    with Session(engine) as session:
        if settings.database_url.startswith("postgresql"):
            effective_role = role_override or (user.role if user else "public")
            effective_team_iso = user.team_iso if user else None
            effective_user_id = user.user_id if user else "system"
            session.execute(text("SELECT set_config('app.user_id', :value, true)"), {"value": effective_user_id})
            session.execute(text("SELECT set_config('app.role', :value, true)"), {"value": effective_role})
            session.execute(text("SELECT set_config('app.team_iso', :value, true)"), {"value": effective_team_iso or ""})
        yield session
