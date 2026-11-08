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

if [[ "$ENV_FILE" == *.example ]]; then
  bash "$ROOT_DIR/scripts/validate-prod-env.sh" --allow-placeholders "$ENV_FILE"
else
  bash "$ROOT_DIR/scripts/validate-prod-env.sh" "$ENV_FILE"
fi

echo "Checking repository security hygiene..."
bash "$ROOT_DIR/scripts/security-repo-scan.sh"

echo "Checking docker compose configuration..."
docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/docker-compose.prod.yml" config >/dev/null

if command -v helm >/dev/null 2>&1; then
  echo "Checking Helm chart..."
  helm lint "$ROOT_DIR/infra/helm/kafontine" >/dev/null
else
  echo "Skipping Helm chart lint: helm is not installed."
fi

echo "Checking backend build..."
(cd "$ROOT_DIR/backend-spring" && mvn -q -Dmaven.test.skip=true package >/dev/null)

echo "Checking frontend build..."
(cd "$ROOT_DIR/front" && npm run build >/dev/null)

echo "Checking frontend tests..."
(cd "$ROOT_DIR/front" && npm run test:run >/dev/null)

echo "Production preflight passed."
