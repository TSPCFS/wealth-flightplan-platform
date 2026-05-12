# Wealth FlightPlan™ Interactive Platform

South African financial planning SaaS — transforms a 192-page book by Wouter Snyman into an interactive web application.

**Phases 1-5 shipped:** Auth, Assessments (5Q/10Q/GAP), Framework + 100+ examples + 15 case studies + 4 calculators, 7 worksheets with PDF/CSV export, Dashboard + Recommendations + Activity + Milestones.

API contract: [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — source of truth for every endpoint.

---

## Stack

- **Backend**: FastAPI (Python 3.11) · SQLAlchemy async · Postgres 15 · Redis · JWT RS256 · Alembic
- **Frontend**: React 18 · TypeScript · Vite · Tailwind · React Hook Form + Zod · Recharts
- **Deploy**: Railway (backend + Postgres + Redis) · Vercel (frontend)

---

## Local development

```bash
cp .env.example .env

# JWT keys (gitignored). The Docker entrypoint will auto-generate on first
# boot if these are missing, but you can do it manually too:
mkdir -p backend/keys
openssl genrsa -out backend/keys/jwt_private.pem 2048
openssl rsa -in backend/keys/jwt_private.pem -pubout -out backend/keys/jwt_public.pem

docker compose up --build
```

- Backend: http://localhost:8000 (Swagger at `/docs`)
- Frontend: http://localhost:3000 (Vite dev: http://localhost:5173)
- Postgres: localhost:5432 · Redis: localhost:6379

Frontend dev outside Docker:

```bash
cd frontend
cp .env.example .env  # VITE_API_URL=http://localhost:8000
npm install
npm run dev          # http://localhost:5173
```

---

## Tests

```bash
# Backend
docker compose exec backend pytest

# Frontend
cd frontend && npm test -- --run
```

---

## Deploying to production

### Backend → Railway

1. **Create a Railway project** and add three services to it:
   - **Postgres** (Railway plugin)
   - **Redis** (Railway plugin)
   - **Backend** — point at the `backend/` directory of this repo

2. **Generate a production JWT keypair locally** (do NOT reuse dev keys):

   ```bash
   openssl genrsa -out /tmp/wfp_prod_priv.pem 2048
   openssl rsa -in /tmp/wfp_prod_priv.pem -pubout -out /tmp/wfp_prod_pub.pem
   ```

3. **Set environment variables on the backend service** (`railway variables`
   or the dashboard's Variables tab):

   | Variable | Value |
   |---|---|
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | from Postgres plugin — replace `postgres://` with `postgresql+asyncpg://` |
   | `REDIS_URL` | from Redis plugin |
   | `JWT_PRIVATE_KEY` | paste full PEM contents of `/tmp/wfp_prod_priv.pem` |
   | `JWT_PUBLIC_KEY` | paste full PEM contents of `/tmp/wfp_prod_pub.pem` |
   | `JWT_ISSUER` | `wealthflightplan` |
   | `FRONTEND_URL` | `https://<your-vercel-domain>.vercel.app` |
   | `CORS_ALLOWED_ORIGINS` | comma-list incl. the Vercel domain |
   | `SENDGRID_API_KEY` | (optional — emails log to stdout if blank) |
   | `EMAIL_FROM` | `noreply@<your-domain>` |
   | `RATE_LIMIT_REGISTER` | `5/hour` (or tune as needed) |

4. **Deploy.** `backend/railway.toml` tells Railway to build from `Dockerfile`
   and run `/app/scripts/entrypoint.sh` (which applies migrations + seeds the
   content catalogue on every boot — both idempotent).

5. **Verify**: `curl https://<your-backend>.up.railway.app/health` → `{"status":"ok"}`

### Frontend → Vercel

1. **Import the repo** on Vercel; set the root directory to `frontend/`.
2. **Project settings:**
   - Framework preset: **Vite** (auto-detected, also pinned in `vercel.json`)
   - Build command: `npm run build` · Output: `dist`
3. **Environment variable**: `VITE_API_URL` = your Railway backend URL
   (e.g. `https://wfp-api.up.railway.app`)
4. **Deploy.**
5. **Important — add the Vercel domain to backend's `CORS_ALLOWED_ORIGINS`** and
   restart the Railway backend service so CORS preflight passes.

### Smoke test the live deployment

```bash
# Register a throwaway user (or reuse the seeded ones if you re-ran the seed)
curl -X POST https://<your-backend>.up.railway.app/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","password":"StrongPass!123#","first_name":"Smoke","last_name":"Test"}'

# Then open the Vercel URL and walk register → verify (link in Railway logs)
# → login → take 5Q → see dashboard populate.
```

---

## Reference docs

- [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — every endpoint, every shape, every pin
- Source manuscript: `wealth_index.md` (in `~/Downloads/files/`) — all 100+ examples, 15 case studies, 7 worksheets

---

## Repo layout

```
backend/                FastAPI app
  app/
    api/                routers (auth, assessments, content, worksheets, users)
    core/               config, security (JWT RS256, bcrypt, HIBP)
    db/                 models, migrations (alembic), seeds
    services/           pure business logic (calculator, worksheet, recommendations, ...)
    schemas/            Pydantic v2 response models (incl. ZuluDateTime + MoneyAmount)
  tests/                pytest async; 240+ tests
  scripts/entrypoint.sh runs migrations + seeds on boot
  railway.toml          Railway deploy config

frontend/               React SPA
  src/
    components/         feature components (auth, assessments, calculators, dashboard, ...)
    pages/              route handlers
    hooks/              shared hooks (auth, debounced value, dashboard stage celebration)
    services/           api.ts wrapper + per-domain services
    types/              TS types (mirrors API contract)
  tests                 vitest + RTL; 190 tests
  vercel.json           SPA rewrites + asset caching

docker-compose.yml      local dev orchestration
docs/API_CONTRACT.md    source-of-truth API spec
```
