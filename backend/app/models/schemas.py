from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Column, DateTime, Float, Index, Integer, JSON, String
from sqlmodel import Field, SQLModel


class Venue(SQLModel, table=True):
    __tablename__ = "venues"

    venue_id: str = Field(primary_key=True, max_length=50)
    name: str = Field(max_length=100)
    city: str = Field(max_length=100)
    country: str = Field(max_length=3)
    altitude_meters: float = Field(default=0.0)
    historical_june_humidity: float = Field(default=0.0)
    historical_june_temp_c: float = Field(default=0.0)


class Team(SQLModel, table=True):
    __tablename__ = "teams"

    team_iso: str = Field(primary_key=True, max_length=3)
    name: str = Field(max_length=100)
    baseline_elo: float = Field(default=1500.0)
    dixon_coles_alpha: float = Field(default=1.0)
    dixon_coles_beta: float = Field(default=1.0)


class Manager(SQLModel, table=True):
    __tablename__ = "managers"

    manager_id: str = Field(primary_key=True, max_length=50)
    team_iso: str = Field(foreign_key="teams.team_iso", max_length=3)
    name: str = Field(max_length=100)
    preferred_formation: str = Field(max_length=10)
    ppda_factor: float = Field(default=0.5)
    defensive_line_height: float = Field(default=50.0)
    directness_index: float = Field(default=0.5)
    field_tilt_baseline: float = Field(default=0.5)
    system_elasticity: float = Field(default=0.5)


class PlayerMetric2026(SQLModel, table=True):
    __tablename__ = "player_metrics_2026"

    player_id: str = Field(primary_key=True, max_length=50)
    team_iso: str = Field(foreign_key="teams.team_iso", max_length=3)
    name: str = Field(max_length=100)
    position: str = Field(max_length=3)
    minutes_played_25_26: int = Field(default=0)
    xg_per_90: float = Field(default=0.0)
    xa_per_90: float = Field(default=0.0)
    psxg_minus_ga_per_90: float = Field(default=0.0)
    progressive_actions_per_90: float = Field(default=0.0)
    defensive_actions_won_pct: float = Field(default=0.0)
    league_coefficient: float = Field(default=1.0)


class Fixture(SQLModel, table=True):
    __tablename__ = "fixtures"
    __table_args__ = (Index("idx_fixtures_teams", "home_team_iso", "away_team_iso"),)

    fixture_id: str = Field(primary_key=True, max_length=50)
    stage: str = Field(max_length=20)
    home_team_iso: str | None = Field(default=None, foreign_key="teams.team_iso", max_length=3)
    away_team_iso: str | None = Field(default=None, foreign_key="teams.team_iso", max_length=3)
    venue_id: str | None = Field(default=None, foreign_key="venues.venue_id", max_length=50)
    kickoff_time: datetime = Field(sa_column=Column(DateTime(timezone=False)))
    home_score: int | None = None
    away_score: int | None = None
    status: str = Field(default="SCHEDULED", max_length=15)


class TravelLog(SQLModel, table=True):
    __tablename__ = "travel_logs"
    __table_args__ = (Index("idx_travel_team_iso", "team_iso"),)

    log_id: int | None = Field(default=None, primary_key=True)
    team_iso: str = Field(foreign_key="teams.team_iso", max_length=3)
    origin_city: str = Field(max_length=100)
    destination_city: str = Field(max_length=100)
    flight_distance_km: float = Field(default=0.0)
    time_zones_crossed: int = Field(default=0)
    rest_hours_available: float = Field(default=0.0)


class SimulationOutput(SQLModel, table=True):
    __tablename__ = "simulation_outputs"

    fixture_id: str = Field(
        primary_key=True,
        foreign_key="fixtures.fixture_id",
        max_length=50,
    )
    simulations_run: int = Field(default=100000)
    home_win_probability: float = Field(default=0.0)
    draw_probability: float = Field(default=0.0)
    away_win_probability: float = Field(default=0.0)
    most_probable_scoreline: str = Field(default="0-0", max_length=10)
    calculated_brier_score: float | None = None
    simulated_score_distribution: dict[str, float] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    last_computed: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=False)),
    )

