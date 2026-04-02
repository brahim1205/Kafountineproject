#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env.prod}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

require_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
}

echo "== Kafontine production preflight =="

require_cmd bash
require_cmd docker
require_cmd git

if ! docker compose version >/dev/null 2>&1; then
  echo "Missing required command: docker compose" >&2
  exit 1
fi

require_file "$ROOT_DIR/docker-compose.prod.yml"
require_file "$ROOT_DIR/.github/workflows/deploy.yml"
require_file "$ROOT_DIR/.github/workflows/backup.yml"
require_file "$ROOT_DIR/.github/workflows/rollback.yml"
require_file "$ROOT_DIR/.github/workflows/disaster-recovery.yml"

bash "$ROOT_DIR/scripts/validate-prod-env.sh" --allow-placeholders "$ENV_FILE"

echo "Checking docker compose configuration..."
docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/docker-compose.prod.yml" config >/dev/null

echo "Checking backend build..."
(cd "$ROOT_DIR/backend" && npm run build >/dev/null)

echo "Checking frontend build..."
(cd "$ROOT_DIR/front" && npm run build >/dev/null)

echo "Checking backend tests..."
(cd "$ROOT_DIR/backend" && npm run test:run >/dev/null)

echo "Checking frontend tests..."
(cd "$ROOT_DIR/front" && npm run test:run >/dev/null)

echo "Production preflight passed."
