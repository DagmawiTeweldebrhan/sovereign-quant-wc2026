from __future__ import annotations

from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.auth import auth_router
from app.api.endpoints import router
from app.config import get_settings
from app.database import apply_postgres_row_level_security, authorized_session, engine, init_db
from app.models.schemas import AuthUser, Fixture, Manager, PlayerMetric2026, Team, Venue
from app.security import hash_password

settings = get_settings()
app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(router)


def _seed_demo_data() -> None:
    with authorized_session(role_override="admin") as db:
        has_teams = db.exec(select(Team)).first() is not None
        if has_teams:
            return

        teams = [
            Team(team_iso="USA", name="United States", baseline_elo=1710.0, dixon_coles_alpha=1.08, dixon_coles_beta=0.92),
            Team(team_iso="MEX", name="Mexico", baseline_elo=1660.0, dixon_coles_alpha=1.02, dixon_coles_beta=0.96),
            Team(team_iso="BRA", name="Brazil", baseline_elo=1880.0, dixon_coles_alpha=1.22, dixon_coles_beta=0.84),
            Team(team_iso="FRA", name="France", baseline_elo=1875.0, dixon_coles_alpha=1.18, dixon_coles_beta=0.86),
        ]
        venues = [
            Venue(
                venue_id="stadium_azteca",
                name="Estadio Azteca",
                city="Mexico City",
                country="MEX",
                altitude_meters=2240.0,
                historical_june_humidity=58.0,
                historical_june_temp_c=22.0,
            ),
            Venue(
                venue_id="metlife",
                name="MetLife Stadium",
                city="East Rutherford",
                country="USA",
                altitude_meters=6.0,
                historical_june_humidity=66.0,
                historical_june_temp_c=27.0,
            ),
        ]
        managers = [
            Manager(
                manager_id="mgr_usa",
                team_iso="USA",
                name="United States Coach",
                preferred_formation="4-3-3",
                ppda_factor=0.58,
                defensive_line_height=53.0,
                directness_index=0.64,
                field_tilt_baseline=0.56,
                system_elasticity=0.48,
            ),
            Manager(
                manager_id="mgr_mex",
                team_iso="MEX",
                name="Mexico Coach",
                preferred_formation="4-2-3-1",
                ppda_factor=0.62,
                defensive_line_height=50.0,
                directness_index=0.59,
                field_tilt_baseline=0.53,
                system_elasticity=0.46,
            ),
            Manager(
                manager_id="mgr_bra",
                team_iso="BRA",
                name="Brazil Coach",
                preferred_formation="4-2-2-2",
                ppda_factor=0.47,
                defensive_line_height=57.0,
                directness_index=0.71,
                field_tilt_baseline=0.62,
                system_elasticity=0.67,
            ),
            Manager(
                manager_id="mgr_fra",
                team_iso="FRA",
                name="France Coach",
                preferred_formation="4-3-3",
                ppda_factor=0.52,
                defensive_line_height=55.0,
                directness_index=0.69,
                field_tilt_baseline=0.60,
                system_elasticity=0.63,
            ),
        ]
        players = [
            PlayerMetric2026(
                player_id="usa_fw_1",
                team_iso="USA",
                name="USA Forward 1",
                position="FW",
                minutes_played_25_26=2400,
                xg_per_90=0.32,
                xa_per_90=0.16,
                psxg_minus_ga_per_90=0.0,
                progressive_actions_per_90=2.0,
                defensive_actions_won_pct=45.0,
                league_coefficient=1.15,
            ),
            PlayerMetric2026(
                player_id="bra_mf_1",
                team_iso="BRA",
                name="Brazil Midfielder 1",
                position="MF",
                minutes_played_25_26=3100,
                xg_per_90=0.24,
                xa_per_90=0.28,
                psxg_minus_ga_per_90=0.0,
                progressive_actions_per_90=3.6,
                defensive_actions_won_pct=54.0,
                league_coefficient=1.30,
            ),
            PlayerMetric2026(
                player_id="fra_gk_1",
                team_iso="FRA",
                name="France Goalkeeper",
                position="GK",
                minutes_played_25_26=3150,
                xg_per_90=0.00,
                xa_per_90=0.00,
                psxg_minus_ga_per_90=0.22,
                progressive_actions_per_90=0.4,
                defensive_actions_won_pct=0.0,
                league_coefficient=1.30,
            ),
            PlayerMetric2026(
                player_id="mex_df_1",
                team_iso="MEX",
                name="Mexico Defender 1",
                position="DF",
                minutes_played_25_26=2800,
                xg_per_90=0.04,
                xa_per_90=0.05,
                psxg_minus_ga_per_90=0.0,
                progressive_actions_per_90=1.2,
                defensive_actions_won_pct=61.0,
                league_coefficient=0.85,
            ),
        ]
        fixtures = [
            Fixture(
                fixture_id="fixture_usa_mex",
                stage="Group",
                home_team_iso="USA",
                away_team_iso="MEX",
                venue_id="metlife",
                kickoff_time=datetime(2026, 6, 12, 19, 0, 0),
                status="SCHEDULED",
            ),
            Fixture(
                fixture_id="fixture_bra_fra",
                stage="Group",
                home_team_iso="BRA",
                away_team_iso="FRA",
                venue_id="stadium_azteca",
                kickoff_time=datetime(2026, 6, 13, 20, 0, 0),
                status="SCHEDULED",
            ),
        ]

        db.add_all([*teams, *venues, *managers, *players, *fixtures])
        db.commit()


def _seed_demo_auth_users() -> None:
    with Session(engine) as db:
        if db.exec(select(AuthUser)).first() is not None:
            return

        demo_password = "WorldCup2026!"
        demo_users = [
            AuthUser(
                user_id="user_admin",
                email="admin@quant.local",
                password_hash=hash_password(demo_password),
                display_name="Tournament Admin",
                role="admin",
                team_iso=None,
                is_active=True,
                created_at=datetime.utcnow(),
            ),
            AuthUser(
                user_id="user_usa",
                email="usa@quant.local",
                password_hash=hash_password(demo_password),
                display_name="USA Analyst",
                role="viewer",
                team_iso="USA",
                is_active=True,
                created_at=datetime.utcnow(),
            ),
            AuthUser(
                user_id="user_mex",
                email="mex@quant.local",
                password_hash=hash_password(demo_password),
                display_name="Mexico Analyst",
                role="viewer",
                team_iso="MEX",
                is_active=True,
                created_at=datetime.utcnow(),
            ),
            AuthUser(
                user_id="user_bra",
                email="bra@quant.local",
                password_hash=hash_password(demo_password),
                display_name="Brazil Analyst",
                role="viewer",
                team_iso="BRA",
                is_active=True,
                created_at=datetime.utcnow(),
            ),
            AuthUser(
                user_id="user_fra",
                email="fra@quant.local",
                password_hash=hash_password(demo_password),
                display_name="France Analyst",
                role="viewer",
                team_iso="FRA",
                is_active=True,
                created_at=datetime.utcnow(),
            ),
        ]
        db.add_all(demo_users)
        db.commit()


@app.on_event("startup")
def startup_event() -> None:
    init_db()
    apply_postgres_row_level_security()
    if settings.seed_demo_data:
        _seed_demo_data()
        _seed_demo_auth_users()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}
