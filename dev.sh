#!/usr/bin/env bash
# Runs backend (port 4000) and client (port 3000) together for local dev.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$ROOT/backend/.env" ]; then
  echo "Missing backend/.env — copy backend/.env.example and fill in TUYA_* values." >&2
  exit 1
fi

cleanup() {
  echo ""
  echo "Stopping..."
  kill 0
}
trap cleanup EXIT INT TERM

(
  cd "$ROOT/backend"
  npm install --no-fund --no-audit
  npm run dev
) 2>&1 | sed -u 's/^/[backend] /' &

(
  cd "$ROOT/client"
  npm install --no-fund --no-audit
  NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4000}" npm run dev
) 2>&1 | sed -u 's/^/[client]  /' &

wait
