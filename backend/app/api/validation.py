from datetime import datetime
from typing import Dict, List

from pydantic import BaseModel, Field


class VenueCreateSchema(BaseModel):
    venue_id: str = Field(..., examples=["stadium_azteca"])
    name: str
    city: str
    country: str = Field(..., min_length=3, max_length=3)
    altitude_meters: float = Field(..., ge=0.0, le=4000.0)
    historical_june_humidity: float = Field(..., ge=0.0, le=100.0)
    historical_june_temp_c: float = Field(..., ge=-10.0, le=55.0)


class IngestMatchResultSchema(BaseModel):
    fixture_id: str
    home_score: int = Field(..., ge=0, le=20)
    away_score: int = Field(..., ge=0, le=20)
    status: str = Field("COMPLETED", pattern="^(COMPLETED)$")


class TeamSummarySchema(BaseModel):
    team_iso: str
    name: str
    baseline_elo: float
    dixon_coles_alpha: float
    dixon_coles_beta: float


class ManagerSummarySchema(BaseModel):
    manager_id: str
    name: str
    preferred_formation: str
    ppda_factor: float
    defensive_line_height: float
    directness_index: float
    field_tilt_baseline: float
    system_elasticity: float


class FixtureSummarySchema(BaseModel):
    fixture_id: str
    stage: str
    home_team_iso: str | None
    away_team_iso: str | None
    venue_id: str | None
    venue_name: str | None
    venue_city: str | None
    venue_altitude_meters: float | None
    kickoff_time: datetime
    status: str
    home_team: TeamSummarySchema | None = None
    away_team: TeamSummarySchema | None = None
    home_manager: ManagerSummarySchema | None = None
    away_manager: ManagerSummarySchema | None = None


class SimulationResponseSchema(BaseModel):
    fixture_id: str
    simulations_run: int
    probabilities: Dict[str, float]
    most_probable_scoreline: str
    score_matrix_distribution: Dict[str, float]
    computed_at: datetime
    calculated_brier_score: float | None = None


class QueueResponseSchema(BaseModel):
    status: str
    task_id: str
    message: str
