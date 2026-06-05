from __future__ import annotations

import asyncio
import json

import redis.asyncio as redis
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlmodel import Session

from app.api.validation import FixtureSummarySchema, QueueResponseSchema, SimulationResponseSchema
from app.config import get_settings
from app.database import engine
from app.models.schemas import Fixture, Manager, SimulationOutput, Team, Venue
from app.workers.tasks import queue_monte_carlo_simulation

router = APIRouter()
settings = get_settings()
redis_client = redis.from_url(settings.redis_url, decode_responses=True)


def _fixture_summary_from_row(
    fixture: Fixture,
    venue: Venue | None,
    home_team: Team | None,
    away_team: Team | None,
    home_manager: Manager | None,
    away_manager: Manager | None,
) -> FixtureSummarySchema:
    return FixtureSummarySchema(
        fixture_id=fixture.fixture_id,
        stage=fixture.stage,
        home_team_iso=fixture.home_team_iso,
        away_team_iso=fixture.away_team_iso,
        venue_id=fixture.venue_id,
        venue_name=venue.name if venue else None,
        venue_city=venue.city if venue else None,
        venue_altitude_meters=venue.altitude_meters if venue else None,
        kickoff_time=fixture.kickoff_time,
        status=fixture.status,
        home_team=home_team.model_dump() if home_team else None,
        away_team=away_team.model_dump() if away_team else None,
        home_manager=home_manager.model_dump() if home_manager else None,
        away_manager=away_manager.model_dump() if away_manager else None,
    )


async def _fetch_fixtures() -> list[FixtureSummarySchema]:
    def query() -> list[FixtureSummarySchema]:
        with Session(engine) as db:
            fixtures = db.exec(select(Fixture).order_by(Fixture.kickoff_time)).all()
            summaries: list[FixtureSummarySchema] = []
            for fixture in fixtures:
                venue = db.get(Venue, fixture.venue_id) if fixture.venue_id else None
                home_team = db.get(Team, fixture.home_team_iso) if fixture.home_team_iso else None
                away_team = db.get(Team, fixture.away_team_iso) if fixture.away_team_iso else None
                home_manager = db.exec(select(Manager).where(Manager.team_iso == fixture.home_team_iso)).first() if fixture.home_team_iso else None
                away_manager = db.exec(select(Manager).where(Manager.team_iso == fixture.away_team_iso)).first() if fixture.away_team_iso else None
                summaries.append(_fixture_summary_from_row(fixture, venue, home_team, away_team, home_manager, away_manager))
            return summaries

    return await asyncio.to_thread(query)


@router.get("/fixtures", response_model=list[FixtureSummarySchema])
async def get_fixtures() -> list[FixtureSummarySchema]:
    return await _fetch_fixtures()


@router.get("/predictions/{fixture_id}", response_model=SimulationResponseSchema)
async def get_fixture_prediction(fixture_id: str) -> SimulationResponseSchema:
    cached_data = await redis_client.get(f"sim:{fixture_id}")
    if cached_data:
        return SimulationResponseSchema.model_validate(json.loads(cached_data))

    def query() -> SimulationResponseSchema | None:
        with Session(engine) as session:
            output = session.get(SimulationOutput, fixture_id)
            if output is None:
                return None
            return SimulationResponseSchema(
                fixture_id=output.fixture_id,
                simulations_run=output.simulations_run,
                probabilities={
                    "home_win": output.home_win_probability,
                    "draw": output.draw_probability,
                    "away_win": output.away_win_probability,
                },
                most_probable_scoreline=output.most_probable_scoreline,
                score_matrix_distribution=output.simulated_score_distribution,
                computed_at=output.last_computed,
            )

    prediction = await asyncio.to_thread(query)
    if prediction:
        return prediction

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Simulation output cold. Post to /simulate to queue calculations.",
    )


@router.post("/simulate/{fixture_id}", response_model=QueueResponseSchema)
async def trigger_match_simulation(fixture_id: str) -> QueueResponseSchema:
    task = queue_monte_carlo_simulation.delay(fixture_id)
    return QueueResponseSchema(
        status="QUEUED",
        task_id=task.id,
        message="100,000 Monte Carlo iterations initiated background loop.",
    )
