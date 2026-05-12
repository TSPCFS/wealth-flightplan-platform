# Wealth FlightPlan — Backend (Phase 1: Auth)

FastAPI + PostgreSQL + Redis. Implements the endpoints defined in
[`docs/API_CONTRACT.md`](../docs/API_CONTRACT.md) for **Phase 1 Authentication**.

## Stack

- Python 3.11
- FastAPI ≥0.110, uvicorn
- SQLAlchemy 2.0 (async) + asyncpg, Alembic for migrations
- Pydantic v2 (`pydantic-settings` for config)
- JWT **RS256** via `python-jose`, bcrypt via `passlib`
- Redis for refresh-token blacklist + per-email rate limits
- `slowapi` for IP-based rate limits (registration)
- pytest + pytest-asyncio (SQLite in-memory + in-memory Redis stub)

## Local dev — Docker (recommended)

```bash
# from repo root
cp .env.example .env
./backend/scripts/generate_keys.sh        # creates backend/keys/jwt_*.pem
docker compose up --build
```

- Backend: <http://localhost:8000> (Swagger at `/docs`, ReDoc at `/redoc`)
- Postgres: `localhost:5432` (`wealthflightplan` / `wealth_user` / `dev_password`)
- Redis: `localhost:6379`

`alembic upgrade head` runs automatically on container start.

> If host ports 5432/6379/8000 are taken by other projects, drop a local
> `docker-compose.override.yml` (gitignored) remapping the published ports.

## Local dev — bare metal

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
./scripts/generate_keys.sh
export $(grep -v '^#' ../.env | xargs)         # or: cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
.venv/bin/python -m pytest --cov=app.services --cov=app.api --cov-report=term
```

Tests use SQLite + an in-memory Redis stub, with an in-process RSA keypair —
no external services required. Current coverage on `app/services/` + `app/api/`:
**88%** (56 tests).

## Lint / format

```bash
.venv/bin/ruff check .
.venv/bin/black --check .
```

## Configuration

All settings are loaded by `app/core/config.py` from environment (or `.env`).
See [`.env.example`](.env.example) for the full list. The most impactful:

| Var | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://…` | Must be the asyncpg driver |
| `REDIS_URL` | `redis://…` | Used for refresh blacklist + login/reset rate limits |
| `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` | `./keys/jwt_*.pem` | RS256 keypair |
| `SENDGRID_API_KEY` | empty | Empty → emails are logged to stdout (dev fallback) |
| `FRONTEND_URL` | `http://localhost:5173` | Verification + reset email links point here |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated |
| `HIBP_ENABLED` | `true` | Toggle HaveIBeenPwned k-anonymity check on registration |
| `RATE_LIMIT_REGISTER` | `5/hour` (per IP) | slowapi format |
| `RATE_LIMIT_LOGIN` | `10/hour` (per email) | Custom Redis bucket |
| `RATE_LIMIT_PASSWORD_RESET` | `3/hour` (per email) | Custom Redis bucket |

## Project layout

```
backend/
├── app/
│   ├── api/          # FastAPI routers (auth.py, users.py, deps.py)
│   ├── core/         # config, security (JWT/bcrypt), errors, logging
│   ├── db/           # SQLAlchemy models, async engine, Alembic migrations
│   ├── schemas/      # Pydantic request/response models
│   ├── services/     # business logic (auth, email, audit, rate_limit, …)
│   └── main.py       # FastAPI app factory + lifespan
├── tests/            # pytest (auth flows, rate limit, CORS, services unit)
├── alembic.ini
├── Dockerfile
├── pyproject.toml
└── scripts/
    ├── entrypoint.sh   # alembic upgrade head + uvicorn
    └── generate_keys.sh
```

## Notes for the frontend agent

- Error envelope on every 4xx/5xx:
  ```json
  { "error": { "code": "STRING_CODE", "message": "…", "details": {…} } }
  ```
- All endpoints, request shapes, and error codes match
  [`docs/API_CONTRACT.md`](../docs/API_CONTRACT.md) byte-for-byte.
- Email verification + password reset links point at `${FRONTEND_URL}/verify-email?token=…`
  and `${FRONTEND_URL}/reset-password?token=…`. With no SendGrid key, the link
  is logged to backend stdout — `docker compose logs backend | grep token=`.

## Security notes

- Passwords: ≥12 chars, mixed case, digit, special char, ≠ email, checked against
  HaveIBeenPwned (fail-open on network error).
- Tokens: RS256, 1h access / 30d refresh. Refresh tokens carry a `tv`
  (token_version) claim — password resets bump `token_version` on the user row,
  invalidating every refresh token issued before the reset.
- Refresh-token revocation is enforced via a Redis blacklist keyed by JWT `jti`
  with a TTL equal to the remaining token lifetime.
- `/auth/password-reset` always returns 200 regardless of whether the email is
  registered (enumeration defense).
- Every auth action writes to `audit_logs` with IP + user-agent + status.
