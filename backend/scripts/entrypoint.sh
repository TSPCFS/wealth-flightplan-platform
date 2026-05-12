#!/usr/bin/env bash
set -euo pipefail

cd /app

# Generate JWT keys if missing (dev convenience — production should mount secrets)
if [[ ! -f /app/keys/jwt_private.pem ]]; then
  /app/scripts/generate_keys.sh
fi

# Apply migrations
alembic upgrade head

# Phase 3+: seed read-only content metadata (idempotent).
python -m app.db.seeds.phase3_content

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
