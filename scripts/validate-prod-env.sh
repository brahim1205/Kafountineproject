#!/usr/bin/env bash
set -euo pipefail

STRICT_MODE=1
ENV_FILE=".env.prod"

for arg in "$@"; do
  case "$arg" in
    --allow-placeholders)
      STRICT_MODE=0
      ;;
    *)
      ENV_FILE="$arg"
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi

required_keys=(
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  DATABASE_URL
  JWT_SECRET
  JWT_REFRESH_SECRET
  CORS_ORIGIN
  PORTAL_URL
  REDIS_PASSWORD
  REDIS_URL
  TRAEFIK_EMAIL
  TRAEFIK_DOMAIN
  GRAFANA_ADMIN_PASSWORD
)

placeholder_patterns=(
  "CHANGE_ME"
  "your-domain.com"
  "example.com"
  "localhost"
)

failures=0

get_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi
  printf '%s' "${line#*=}"
}

for key in "${required_keys[@]}"; do
  if ! value="$(get_value "$key")"; then
    echo "Missing required key: $key" >&2
    failures=1
    continue
  fi

  if [[ -z "$value" ]]; then
    echo "Empty required key: $key" >&2
    failures=1
    continue
  fi

  if [[ "$STRICT_MODE" -eq 1 ]]; then
    for pattern in "${placeholder_patterns[@]}"; do
      if [[ "$value" == *"$pattern"* ]]; then
        echo "Placeholder detected for $key: $value" >&2
        failures=1
        break
      fi
    done
  fi
done

if [[ "$failures" -ne 0 ]]; then
  echo "Production environment validation failed for $ENV_FILE" >&2
  exit 1
fi

if [[ "$STRICT_MODE" -eq 1 ]]; then
  echo "Production environment validation passed for $ENV_FILE"
else
  echo "Production environment template validation passed for $ENV_FILE"
fi
