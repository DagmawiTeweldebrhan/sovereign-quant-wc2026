# Sovereign Quant World Cup 2026

Phase 1 of a modular World Cup forecasting system.

## What is included

- FastAPI backend with seeded demo data
- SQLModel/PostgreSQL-ready schema
- Redis-backed simulation cache
- Celery worker for Monte Carlo queueing
- React + Tailwind frontend shell

## Local run

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run start
```

### Docker

```bash
docker compose up --build
```

The Postgres container auto-runs `backend/sql/init.sql` on first launch to create the ledger schema and indexes.

## Phase workflow

This repo is intended to be shipped in small working increments. Each phase should be committed with a focused message, then pushed before the next feature slice lands.
