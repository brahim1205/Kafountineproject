#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"

if [[ -z "$BASE_URL" ]]; then
  echo "Usage: bash scripts/smoke-prod.sh https://your-domain.com" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

check_url() {
  local label="$1"
  local url="$2"
  local code
  code="$(curl -k -sS -o /tmp/kafontine_smoke_body.txt -w "%{http_code}" --max-time 20 "$url")"
  if [[ "$code" =~ ^2|3 ]]; then
    echo "[OK] $label -> $code"
  else
    echo "[FAIL] $label -> $code ($url)" >&2
    cat /tmp/kafontine_smoke_body.txt >&2 || true
    exit 1
  fi
}

require_cmd curl

echo "== Kafontine production smoke test =="
check_url "frontend" "$BASE_URL/"
check_url "health" "$BASE_URL/health"
check_url "ready" "$BASE_URL/ready"
check_url "portal home" "$BASE_URL/portal"

echo "Smoke test passed for $BASE_URL"
