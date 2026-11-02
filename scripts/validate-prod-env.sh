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
  TRUST_PROXY
  COOKIE_SAME_SITE
  CORS_ORIGIN
  PORTAL_URL
  PORTAL_OTP_DELIVERY_MODE
  PORTAL_OTP_WEBHOOK_URL
  PORTAL_OTP_WEBHOOK_TOKEN
  ENABLE_API_DOCS
  ENABLE_METRICS
  METRICS_BEARER_TOKEN
  REDIS_PASSWORD
  REDIS_URL
  TRAEFIK_EMAIL
  TRAEFIK_DOMAIN
  GRAFANA_ADMIN_PASSWORD
)

optional_placeholder_checked_keys=(
  GRAFANA_ROOT_URL
)

placeholder_patterns=(
  "CHANGE_ME"
  "change-me"
  "your-domain.com"
  "example.com"
  "localhost"
  "__SET_"
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

jwt_secret="$(get_value JWT_SECRET || true)"
jwt_refresh_secret="$(get_value JWT_REFRESH_SECRET || true)"
trust_proxy="$(get_value TRUST_PROXY || true)"
cookie_same_site="$(get_value COOKIE_SAME_SITE || true)"
cors_origin="$(get_value CORS_ORIGIN || true)"
portal_url="$(get_value PORTAL_URL || true)"
portal_otp_delivery_mode="$(get_value PORTAL_OTP_DELIVERY_MODE || true)"
portal_otp_webhook_url="$(get_value PORTAL_OTP_WEBHOOK_URL || true)"
enable_api_docs="$(get_value ENABLE_API_DOCS || true)"
enable_metrics="$(get_value ENABLE_METRICS || true)"
metrics_bearer_token="$(get_value METRICS_BEARER_TOKEN || true)"
vite_api_url="$(get_value VITE_API_URL || true)"

if [[ -n "$jwt_secret" && "${#jwt_secret}" -lt 32 ]]; then
  echo "JWT_SECRET must contain at least 32 characters" >&2
  failures=1
fi

if [[ -n "$jwt_refresh_secret" && "${#jwt_refresh_secret}" -lt 32 ]]; then
  echo "JWT_REFRESH_SECRET must contain at least 32 characters" >&2
  failures=1
fi

if [[ -n "$jwt_secret" && -n "$jwt_refresh_secret" && "$jwt_secret" == "$jwt_refresh_secret" ]]; then
  echo "JWT_SECRET and JWT_REFRESH_SECRET must be different" >&2
  failures=1
fi

is_valid_trust_proxy_entry() {
  local entry="$1"
  case "$entry" in
    loopback|linklocal|uniquelocal) return 0 ;;
  esac
  [[ "$entry" =~ ^[0-9a-fA-F:.]+(/[0-9]{1,3})?$ ]]
}

if [[ "$trust_proxy" == "true" || "$trust_proxy" =~ ^[0-9]+$ ]]; then
  echo "TRUST_PROXY must not trust all proxies or a hop count in production" >&2
  failures=1
elif [[ "$trust_proxy" != "false" ]]; then
  IFS=',' read -r -a trust_proxy_entries <<< "$trust_proxy"
  for entry in "${trust_proxy_entries[@]}"; do
    entry="$(printf '%s' "$entry" | xargs)"
    if [[ -z "$entry" ]] || ! is_valid_trust_proxy_entry "$entry"; then
      echo "TRUST_PROXY must be false, loopback/linklocal/uniquelocal, or explicit IP/CIDR entries" >&2
      failures=1
      break
    fi
  done
fi

case "$cookie_same_site" in
  lax|strict|none) ;;
  *)
    echo "COOKIE_SAME_SITE must be one of: lax, strict, none" >&2
    failures=1
    ;;
esac

if [[ "$cors_origin" == *"*"* ]]; then
  echo "CORS_ORIGIN must not contain wildcard origins in production" >&2
  failures=1
fi

if [[ "$portal_url" != https://* ]]; then
  echo "PORTAL_URL must use HTTPS in production" >&2
  failures=1
fi

if [[ "$portal_otp_delivery_mode" != "webhook" ]]; then
  echo "PORTAL_OTP_DELIVERY_MODE must be webhook in production" >&2
  failures=1
fi

if [[ "$portal_otp_webhook_url" != https://* ]]; then
  echo "PORTAL_OTP_WEBHOOK_URL must use HTTPS in production" >&2
  failures=1
fi

if [[ "$enable_api_docs" != "false" ]]; then
  echo "ENABLE_API_DOCS must be false in production" >&2
  failures=1
fi

if [[ "$enable_metrics" == "true" && "${#metrics_bearer_token}" -lt 32 ]]; then
  echo "METRICS_BEARER_TOKEN must contain at least 32 characters when ENABLE_METRICS=true" >&2
  failures=1
fi

if [[ -n "$vite_api_url" && "$vite_api_url" != "/api/v1" ]]; then
  echo "VITE_API_URL must be /api/v1 in production so CSP connect-src remains same-origin" >&2
  failures=1
fi

if [[ "$STRICT_MODE" -eq 1 ]]; then
  for key in "${optional_placeholder_checked_keys[@]}"; do
    if value="$(get_value "$key")"; then
      for pattern in "${placeholder_patterns[@]}"; do
        if [[ "$value" == *"$pattern"* ]]; then
          echo "Placeholder detected for $key: $value" >&2
          failures=1
          break
        fi
      done
    fi
  done
fi

if [[ "$failures" -ne 0 ]]; then
  echo "Production environment validation failed for $ENV_FILE" >&2
  exit 1
fi

if [[ "$STRICT_MODE" -eq 1 ]]; then
  echo "Production environment validation passed for $ENV_FILE"
else
  echo "Production environment template validation passed for $ENV_FILE"
fi
