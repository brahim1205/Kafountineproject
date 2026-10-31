#!/usr/bin/env bash
set -euo pipefail
umask 077

app_dir=${1:?Application directory required}
backend_image=${2:?Backend image required}
frontend_image=${3:?Frontend image required}
operation=${4:-deploy}
[[ "$backend_image" =~ ^[a-zA-Z0-9][a-zA-Z0-9._/:@-]+$ ]]
[[ "$frontend_image" =~ ^[a-zA-Z0-9][a-zA-Z0-9._/:@-]+$ ]]
[[ "$operation" == deploy || "$operation" == rollback ]]
cd "$app_dir"
exec 9>.production.lock
flock -w 300 9
base=(docker compose --env-file .env.prod -f docker-compose.prod.yml)
services=$("${base[@]}" config --services </dev/null)
if grep -qx frontend <<< "$services"; then
  front_service=frontend
elif grep -qx front <<< "$services"; then
  front_service=front
else
  echo 'No frontend service in production compose file' >&2
  exit 1
fi
override=$(mktemp .compose-release.XXXXXX.yml)
trap 'rm -f "$override"' EXIT
cat > "$override" <<EOF
services:
  backend:
    image: $backend_image
  $front_service:
    image: $frontend_image
EOF
compose=("${base[@]}" -f "$override")
"${compose[@]}" pull backend "$front_service" </dev/null
"${compose[@]}" up -d postgres redis </dev/null
if grep -qx otel-collector <<< "$services"; then
  "${compose[@]}" up -d otel-collector </dev/null
fi
if [[ "$operation" == deploy ]]; then
  "${compose[@]}" run --rm -T backend npx prisma migrate deploy </dev/null
fi
"${compose[@]}" up -d --no-build --no-deps backend "$front_service" </dev/null
for attempt in {1..30}; do
  if "${compose[@]}" exec -T backend node -e 'fetch("http://127.0.0.1:3000/ready", {signal: AbortSignal.timeout(5000)}).then(r => {if (!r.ok) process.exit(1);}).catch(() => process.exit(1))' </dev/null; then
    if [[ -f .compose-images.yml ]]; then
      cp .compose-images.yml .compose-images.previous.yml
    fi
    cp "$override" .compose-images.yml
    printf '%s %s backend=%s frontend=%s\n' "$(date -u +%FT%TZ)" "$operation" "$backend_image" "$frontend_image" >> deployment.log
    exit 0
  fi
  sleep 2
done
echo 'Backend readiness failed after deployment; inspect container logs' >&2
exit 1
