# Wealth FlightPlan™ Interactive Platform

South African financial planning SaaS — transforms a 192-page book by Wouter Snyman into an interactive web application.

## Phase 1 — Authentication & User Management

Two IDE agents work in parallel:
- **Backend agent** owns `backend/` — FastAPI + Postgres + JWT
- **Frontend agent** owns `frontend/` — React + Vite + Tailwind

**API contract:** [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — both agents conform to this.

## Local dev

```bash
cp .env.example .env
# generate JWT keypair
mkdir -p backend/keys
openssl genrsa -out backend/keys/jwt_private.pem 2048
openssl rsa -in backend/keys/jwt_private.pem -pubout -out backend/keys/jwt_public.pem

docker compose up --build
```

- Backend: http://localhost:8000 (Swagger at /docs)
- Frontend: http://localhost:3000 (Vite dev: http://localhost:5173)
- Postgres: localhost:5432
- Redis: localhost:6379

## Reference docs

Source-of-truth specs in `/Users/cornels/Downloads/files/`:
- `CLAUDE_CODE_INSTRUCTIONS.md` — master guide
- `wealthflightplan_platform_specification.md` — full technical design
- `DATABASE_SCHEMA.md` — Postgres DDL
- `wealth_index.md` — content catalog (Phase 3+)
- `wealthflightplan_implementation_quickstart.md` — workflow + testing
