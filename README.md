# Sovereign Quant World Cup 2026

Phase 1 of a modular World Cup forecasting system.

## What is included

- FastAPI backend with seeded demo data
- Signed authentication with demo accounts
- SQLModel/PostgreSQL-ready schema
- PostgreSQL row-level security policies
- Redis-backed simulation cache
- Celery worker for Monte Carlo queueing
- React + Tailwind frontend shell with a light dashboard

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

The frontend dev server uses `/api` by default and proxies requests to the backend. If you run it in Docker, the proxy target is already wired to the API service.

### Docker

```bash
docker compose up --build
```

The Postgres container auto-runs `backend/sql/init.sql` on first launch to create the ledger schema and indexes.

## Demo login

- Admin: `admin@quant.local` / `WorldCup2026!`
- Team viewers: `usa@quant.local`, `mex@quant.local`, `bra@quant.local`, `fra@quant.local` / `WorldCup2026!`

Admin access can ingest results and manage venues. Viewer accounts are read-only and row-scoped.

For a custom local setup, copy `frontend/.env.example` to `frontend/.env` and adjust the proxy target if your backend runs somewhere else.

## Phase workflow

This repo is intended to be shipped in small working increments. Each phase should be committed with a focused message, then pushed before the next feature slice lands.
