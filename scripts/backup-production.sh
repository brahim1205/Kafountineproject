#!/usr/bin/env bash
set -euo pipefail
umask 077

app_dir=${1:-/opt/kafontine}
filename=${2:-kafontine_$(date -u +%Y%m%dT%H%M%SZ).dump}
retention=${BACKUP_RETENTION_DAYS:-14}
[[ "$filename" =~ ^[a-zA-Z0-9_-]+\.dump$ ]] || { echo 'Invalid backup filename' >&2; exit 1; }
[[ "$retention" =~ ^[0-9]+$ ]] && (( retention >= 1 ))
cd "$app_dir"
test -f .env.prod
test -f docker-compose.prod.yml
mkdir -p backups
exec 9>backups/.backup.lock
flock -w 300 9
test ! -e "backups/$filename"
partial=$(mktemp "backups/.${filename}.XXXXXX")
trap 'rm -f "$partial"' EXIT
compose=(docker compose --env-file .env.prod -f docker-compose.prod.yml)
"${compose[@]}" exec -T postgres sh -ec 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' </dev/null > "$partial"
test -s "$partial"
"${compose[@]}" exec -T postgres pg_restore --list < "$partial" >/dev/null
mv "$partial" "backups/$filename"
find backups -maxdepth 1 -type f -name 'kafontine_*.dump' -mtime +"$retention" -delete
printf 'Backup verified: %s/backups/%s\n' "$app_dir" "$filename"
