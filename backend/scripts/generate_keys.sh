#!/usr/bin/env bash
# Generate an RS256 keypair into backend/keys/ (gitignored).
set -euo pipefail

KEY_DIR="${KEY_DIR:-$(cd "$(dirname "$0")/.." && pwd)/keys}"
mkdir -p "$KEY_DIR"

if [[ -f "$KEY_DIR/jwt_private.pem" && -f "$KEY_DIR/jwt_public.pem" ]]; then
  echo "JWT keys already exist at $KEY_DIR — leaving in place."
  exit 0
fi

openssl genrsa -out "$KEY_DIR/jwt_private.pem" 2048
openssl rsa -in "$KEY_DIR/jwt_private.pem" -pubout -out "$KEY_DIR/jwt_public.pem"
chmod 600 "$KEY_DIR/jwt_private.pem"
echo "Wrote $KEY_DIR/jwt_private.pem and $KEY_DIR/jwt_public.pem"
