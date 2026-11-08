#!/usr/bin/env bash
set -euo pipefail

failures=0

echo "== Repository security scan =="

tracked_env_files="$(git ls-files | grep -E '(^|/)\.env($|\.|/)' | grep -vE '(\.example$|\.sample$|\.template$)' || true)"
if [[ -n "$tracked_env_files" ]]; then
  echo "Tracked environment files detected:" >&2
  echo "$tracked_env_files" >&2
  failures=1
fi

local_env_files="$(
  find . -maxdepth 3 -type f \( -name '.env' -o -name '.env.*' \) \
    -not -name '*.example' \
    -not -name '*.sample' \
    -not -name '*.template' \
    -not -path './node_modules/*' \
    -not -path './front/node_modules/*' \
    -not -path './database/node_modules/*' \
    -not -path './pg_data/*' |
    sort || true
)"
if [[ -n "$local_env_files" ]]; then
  echo "Warning: local environment files exist and must stay out of Git:" >&2
  echo "$local_env_files" >&2
fi

tracked_runtime_data="$(git ls-files | grep -E '(^pg_data/|/pg_data/|database/prisma/.*\.(db|db-journal|backup)$)' || true)"
if [[ -n "$tracked_runtime_data" ]]; then
  echo "Tracked runtime database artifacts detected:" >&2
  echo "$tracked_runtime_data" >&2
  failures=1
fi

secret_hits="$(
  git grep -n -I -E '(JWT_SECRET|JWT_REFRESH_SECRET|POSTGRES_PASSWORD|REDIS_PASSWORD|GRAFANA_ADMIN_PASSWORD|PORTAL_OTP_WEBHOOK_TOKEN|METRICS_BEARER_TOKEN|DATABASE_URL)=' -- \
    ':!*.example' \
    ':!*.sample' \
    ':!*.template' \
    ':!package-lock.json' \
    ':!front/package-lock.json' \
    ':!database/package-lock.json' |
    grep -v -E "(=(__SET_|CHANGE_ME|local-dev|postgres123|redis://:__SET_|postgresql://postgres:__SET_|postgresql://\\.\\.\\.|process\.env|\\$\\{|CHANGE_ME_)|='\\.\\.\\.'|=\\\"\\$\\{[A-Z_]+:\\?)" || true
)"

if [[ -n "$secret_hits" ]]; then
  echo "Potential hard-coded secret values detected:" >&2
  echo "$secret_hits" >&2
  failures=1
fi

frontend_third_party_assets="$(
  git grep -n -I -E 'https://(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|images\.unsplash\.com|ui-avatars\.com)' -- \
    'front/index.html' \
    'front/src' || true
)"
if [[ -n "$frontend_third_party_assets" ]]; then
  echo "Frontend runtime third-party asset URLs detected:" >&2
  echo "$frontend_third_party_assets" >&2
  failures=1
fi

if grep -Eq '/etc/nginx/templates/.*\.template' front/Dockerfile.prod &&
   grep -Eq '\$(host|remote_addr|proxy_add_x_forwarded_for|scheme)' front/nginx.conf &&
   ! grep -Eq 'NGINX_ENVSUBST_FILTER=.*NGINX_BACKEND_URL' front/Dockerfile.prod; then
  echo "Nginx template uses native Nginx variables without NGINX_ENVSUBST_FILTER." >&2
  failures=1
fi

if [[ "$failures" -ne 0 ]]; then
  echo "Repository security scan failed." >&2
  exit 1
fi


echo "Repository security scan passed."
