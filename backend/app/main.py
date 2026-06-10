from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import router as api_router
from app.auth import router as auth_router
from app.database import apply_postgres_row_level_security

app = FastAPI(
    title="Sovereign Quant World Cup 2026",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def startup_event() -> None:
    try:
        apply_postgres_row_level_security()
    except Exception:
        # Keep the API reachable even if the relational backend is unavailable.
        return


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Sovereign Quant World Cup 2026 API"}
