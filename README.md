# Skillful Marketplace — Eventsee MVP

Eventsee is a two-sided wedding and event planner marketplace: **Next.js (TypeScript) + FastAPI + PostgreSQL**, mobile-first UI, no Docker for local services (per [`.cursor/skills/tech-stack/SKILL.md`](.cursor/skills/tech-stack/SKILL.md)).

## Prerequisites (macOS)

- Homebrew PostgreSQL running locally (`brew install postgresql@16`, `brew services start postgresql@16`)
- Node 20+ and npm
- Python 3.11+ recommended (**3.9+** supported; ORM mapped types use `typing.Optional` for SQLAlchemy on 3.9)

## Database

Create a database and user matching your `DATABASE_URL` (defaults shown in [`.env.example`](.env.example)):

```bash
createdb eventsee
```

## API (FastAPI)

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # then edit DATABASE_URL if needed
alembic upgrade head
PYTHONPATH=. python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

Health check: `curl -s http://127.0.0.1:8000/v1/health`

Seeded accounts (local only):

| Role    | Email                 | Password          |
|---------|-----------------------|-------------------|
| Admin   | `admin@eventsee.local` | `adminadmin12`   |
| Planner | `planner@eventsee.local` | `plannerplanner12` |
| Client  | `client@eventsee.local`  | `clientclient12`   |

Premium placement is toggled via the admin API (`PATCH /v1/admin/planners/{id}/premium`) or the seeded planner row — **Stripe is intentionally not included in this MVP.**

## Web (Next.js)

```bash
cd web
npm install
npm run dev
```

The dev server rewrites `/api/v1/*` to the FastAPI service at `http://127.0.0.1:8000/v1/*` so **session cookies stay on the Next origin** during local development ([`web/next.config.ts`](web/next.config.ts)).

Smoke: open `http://localhost:3000`, browse planners, hit `http://localhost:3000/api/v1/health` (proxied).

## Tests

```bash
cd api
source .venv/bin/activate
pytest
```

The API uses the **psycopg v3** driver (`postgresql+psycopg://…` in `DATABASE_URL`) so `pip install` can use wheels without a local `pg_config`.

## Implementation tracking

See [`docs/eventsee-implementation-tracking.md`](docs/eventsee-implementation-tracking.md) for build status.
