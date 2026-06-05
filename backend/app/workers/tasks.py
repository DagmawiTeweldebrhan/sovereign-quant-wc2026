from __future__ import annotations

import json
from datetime import datetime

import pandas as pd
import numpy as np
import redis
from celery import Celery
from sqlalchemy import select
from sqlmodel import Session

from app.config import get_settings
from app.database import engine
from app.ml.dixon_coles import TeamStrength, score_probability_matrix
from app.ml.tactical_engine import TacticalProfile, build_tactical_friction_features
from app.models.schemas import (
    Fixture,
    Manager,
    PlayerMetric2026,
    SimulationOutput,
    Team,
    Venue,
)
from app.workers.simulator import run_monte_carlo_engine

settings = get_settings()

celery_app = Celery("tasks", broker=settings.redis_url, backend=settings.redis_url)
redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)


def _team_player_frame(db: Session, team_iso: str) -> pd.DataFrame:
    statement = select(PlayerMetric2026).where(PlayerMetric2026.team_iso == team_iso)
    records = db.exec(statement).all()
    if not records:
        return pd.DataFrame(
            [
                {
                    "xg_per_90": 0.1,
                    "xa_per_90": 0.1,
                    "psxg_minus_ga_per_90": 0.0,
                    "progressive_actions_per_90": 0.1,
                    "defensive_actions_won_pct": 50.0,
                    "league_coefficient": 1.0,
                    "position": "FW",
                }
            ]
        )
    return pd.DataFrame([record.model_dump() for record in records])


def _aggregate_team_attack(df: pd.DataFrame) -> float:
    league_adjusted = df["league_coefficient"].fillna(1.0)
    return float(((df["xg_per_90"] + df["xa_per_90"] + df["progressive_actions_per_90"]) * league_adjusted).mean())


def _aggregate_team_defense(df: pd.DataFrame) -> float:
    league_adjusted = df["league_coefficient"].fillna(1.0)
    return float(
        (
            (df["psxg_minus_ga_per_90"].fillna(0.0) + df["defensive_actions_won_pct"].fillna(0.0) / 100.0)
            * league_adjusted
        ).mean()
    )


def _build_manager_profile(manager: Manager) -> TacticalProfile:
    return TacticalProfile(
        manager_id=manager.manager_id,
        name=manager.name,
        preferred_formation=manager.preferred_formation,
        ppda_factor=manager.ppda_factor,
        defensive_line_height=manager.defensive_line_height,
        directness_index=manager.directness_index,
        field_tilt_baseline=manager.field_tilt_baseline,
        system_elasticity=manager.system_elasticity,
    )


def _resolve_fixture_context(db: Session, fixture_id: str) -> tuple[Fixture, Venue | None, Team | None, Team | None, Manager | None, Manager | None]:
    fixture = db.get(Fixture, fixture_id)
    if fixture is None:
        raise ValueError(f"Unknown fixture: {fixture_id}")
    venue = db.get(Venue, fixture.venue_id) if fixture.venue_id else None
    home_team = db.get(Team, fixture.home_team_iso) if fixture.home_team_iso else None
    away_team = db.get(Team, fixture.away_team_iso) if fixture.away_team_iso else None
    home_manager = db.exec(select(Manager).where(Manager.team_iso == fixture.home_team_iso)).first() if fixture.home_team_iso else None
    away_manager = db.exec(select(Manager).where(Manager.team_iso == fixture.away_team_iso)).first() if fixture.away_team_iso else None
    return fixture, venue, home_team, away_team, home_manager, away_manager


@celery_app.task(name="queue_monte_carlo_simulation")
def queue_monte_carlo_simulation(fixture_id: str) -> str:
    with Session(engine) as db:
        fixture, venue, home_team, away_team, home_manager, away_manager = _resolve_fixture_context(db, fixture_id)
        if home_team is None or away_team is None:
            raise ValueError("Fixture teams are missing")

        home_players = _team_player_frame(db, home_team.team_iso)
        away_players = _team_player_frame(db, away_team.team_iso)
        home_attack = _aggregate_team_attack(home_players)
        away_attack = _aggregate_team_attack(away_players)
        home_defense = _aggregate_team_defense(home_players)
        away_defense = _aggregate_team_defense(away_players)

        venue_altitude = venue.altitude_meters if venue else 0.0
        climate_penalty = (venue_altitude / 4000.0) * 0.15 if venue_altitude else 0.0

        home_profile = _build_manager_profile(home_manager) if home_manager else TacticalProfile("home", "Home", "4-3-3", 0.55, 52.0, 0.6, 0.55)
        away_profile = _build_manager_profile(away_manager) if away_manager else TacticalProfile("away", "Away", "4-2-3-1", 0.55, 50.0, 0.55, 0.5)
        tactical_features = build_tactical_friction_features(home_profile, away_profile)
        tactical_index = sum(tactical_features.values()) / max(len(tactical_features), 1)

        baseline_home = max(0.2, 1.15 + home_attack - away_defense + (home_team.dixon_coles_alpha - away_team.dixon_coles_beta))
        baseline_away = max(0.2, 1.00 + away_attack - home_defense + (away_team.dixon_coles_alpha - home_team.dixon_coles_beta))
        home_lambda = max(0.2, baseline_home + 0.12 - climate_penalty + tactical_index * 0.05)
        away_lambda = max(0.2, baseline_away - 0.04 - climate_penalty + tactical_index * 0.03)
        tau_d = float(np.clip((tactical_features["friction_press"] - tactical_features["friction_directness"]) * 0.1, -0.15, 0.15))

        results = run_monte_carlo_engine(home_lambda, away_lambda, tau_d, iterations=100_000)
        score_distribution = score_probability_matrix(
            TeamStrength(alpha=home_team.dixon_coles_alpha, beta=home_team.dixon_coles_beta),
            TeamStrength(alpha=away_team.dixon_coles_alpha, beta=away_team.dixon_coles_beta),
            d=tau_d,
        )
        brier_score = float(
            (results["home_win"] - 0.5) ** 2 + (results["draw"] - 0.25) ** 2 + (results["away_win"] - 0.25) ** 2
        )

        simulation = db.get(SimulationOutput, fixture_id) or SimulationOutput(fixture_id=fixture_id)
        simulation.simulations_run = 100_000
        simulation.home_win_probability = float(results["home_win"])
        simulation.draw_probability = float(results["draw"])
        simulation.away_win_probability = float(results["away_win"])
        simulation.most_probable_scoreline = str(results["most_probable_scoreline"])
        simulation.calculated_brier_score = brier_score
        simulation.simulated_score_distribution = dict(results["distribution"])
        simulation.last_computed = datetime.utcnow()
        db.merge(simulation)
        db.commit()

        payload = {
            "fixture_id": fixture_id,
            "simulations_run": 100_000,
            "probabilities": {
                "home_win": float(results["home_win"]),
                "draw": float(results["draw"]),
                "away_win": float(results["away_win"]),
            },
            "most_probable_scoreline": str(results["most_probable_scoreline"]),
            "score_matrix_distribution": dict(results["distribution"]),
            "computed_at": simulation.last_computed.isoformat(),
            "calculated_brier_score": brier_score,
        }
        redis_client.setex(f"sim:{fixture_id}", 86400, json.dumps(payload))
        return f"Simulation complete for fixture {fixture_id}"
