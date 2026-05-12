#!/usr/bin/env bash
set -euo pipefail

cd /app

# JWT keys: production MUST supply JWT_PRIVATE_KEY + JWT_PUBLIC_KEY env vars
# (full PEM content; escaped \n sequences are accepted). Dev/test falls back
# to generating an ephemeral keypair on first boot. Auto-generation is unsafe
# in production because each replica would mint different keys — tokens
# issued by one wouldn't verify on another.
if [[ -z "${JWT_PRIVATE_KEY:-}" || -z "${JWT_PUBLIC_KEY:-}" ]]; then
  if [[ "${ENVIRONMENT:-development}" == "production" ]]; then
    echo "FATAL: JWT_PRIVATE_KEY + JWT_PUBLIC_KEY env vars are required in production." >&2
    exit 1
  fi
  if [[ ! -f /app/keys/jwt_private.pem ]]; then
    /app/scripts/generate_keys.sh
  fi
fi

# Apply migrations (idempotent — alembic tracks state).
alembic upgrade head

# Seed read-only content metadata (idempotent — upserts on content_code).
python -m app.db.seeds.phase3_content
python -m app.db.seeds.phase4_worksheets

# Port: honour Railway/Render's $PORT, fall back to 8000 for local Docker.
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
