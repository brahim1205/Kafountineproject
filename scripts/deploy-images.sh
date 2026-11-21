#!/usr/bin/env bash
set -euo pipefail
umask 077

app_dir=${1:?Application directory required}
backend_image=${2:?Backend image required}
frontend_image=${3:?Frontend image required}
operation=${4:-deploy}
# Image Node contenant Prisma : les migrations restent gérées par Prisma quel que soit le backend.
migrator_image=${5:-}
[[ "$backend_image" =~ ^[a-zA-Z0-9][a-zA-Z0-9._/:@-]+$ ]]
[[ "$frontend_image" =~ ^[a-zA-Z0-9][a-zA-Z0-9._/:@-]+$ ]]
[[ "$operation" == deploy || "$operation" == rollback ]]
[[ -z "$migrator_image" || "$migrator_image" =~ ^[a-zA-Z0-9][a-zA-Z0-9._/:@-]+$ ]]
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
# Le fichier compose du serveur n'est pas mis à jour par le déploiement : la limite de taille
# des logs est donc imposée ici, à chaque mise en ligne (5 fichiers de 20 Mo par service).
cat > "$override" <<EOF
services:
  backend:
    image: $backend_image
    logging:
      driver: json-file
      options: {max-size: "20m", max-file: "5"}
  $front_service:
    image: $frontend_image
    logging:
      driver: json-file
      options: {max-size: "20m", max-file: "5"}
EOF
if [[ -n "$migrator_image" ]]; then
  cat >> "$override" <<EOF
  migrator:
    image: $migrator_image
    profiles: [tools]
    environment:
      DATABASE_URL: \${DATABASE_URL}
EOF
fi
compose=("${base[@]}" -f "$override")
"${compose[@]}" pull backend "$front_service" </dev/null
"${compose[@]}" up -d postgres redis </dev/null
if grep -qx otel-collector <<< "$services"; then
  "${compose[@]}" up -d otel-collector </dev/null
fi
if [[ "$operation" == deploy ]]; then
  if [[ -n "$migrator_image" ]]; then
    "${compose[@]}" pull migrator </dev/null
    "${compose[@]}" run --rm -T migrator npx prisma migrate deploy </dev/null
  else
    "${compose[@]}" run --rm -T backend npx prisma migrate deploy </dev/null
  fi
fi
"${compose[@]}" up -d --no-build --no-deps backend "$front_service" </dev/null
for attempt in {1..60}; do
  # Contrôle depuis le frontend : indépendant de la technologie du backend.
  if "${compose[@]}" exec -T "$front_service" wget -q -O /dev/null http://backend:3000/ready </dev/null; then
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
"${compose[@]}" logs --tail 80 backend </dev/null >&2 || true
if [[ "$operation" == deploy && -f .compose-images.yml ]]; then
  echo 'Restoring the previous release' >&2
  "${base[@]}" -f .compose-images.yml up -d --no-build --no-deps backend "$front_service" </dev/null
fi
exit 1
