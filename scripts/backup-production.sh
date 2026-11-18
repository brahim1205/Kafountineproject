#!/usr/bin/env bash
# Sauvegarde vérifiée de la base et des fichiers déposés (photos), avec conservation longue durée.
#
#   backups/kafontine_*.dump               base, une ou plusieurs par jour      gardées 30 jours
#   backups/kafontine_*.uploads.tar.gz     fichiers déposés, même rythme        gardés 30 jours
#   backups/pre_*.dump (+ .uploads.tar.gz)  avant déploiement / retour / restauration   60 jours
#   backups/mensuel/AAAA-MM.*              première sauvegarde de chaque mois   gardée 2 ans
#   backups/annuel/AAAA.*                  première sauvegarde de chaque année  gardée pour toujours
#
# Lancé chaque nuit par le minuteur systemd du serveur (sans argument) et par GitHub Actions.
set -euo pipefail
umask 077

app_dir=${1:-/opt/kafontine}
filename=${2:-kafontine_$(date -u +%Y%m%dT%H%M%SZ).dump}
daily_days=${BACKUP_DAILY_RETENTION_DAYS:-30}
pre_days=${BACKUP_PRE_RETENTION_DAYS:-60}
monthly_days=${BACKUP_MONTHLY_RETENTION_DAYS:-730}
[[ "$filename" =~ ^[a-zA-Z0-9_-]+\.dump$ ]] || { echo 'Invalid backup filename' >&2; exit 1; }
for n in "$daily_days" "$pre_days" "$monthly_days"; do [[ "$n" =~ ^[0-9]+$ ]] && (( n >= 1 )); done
cd "$app_dir"
test -f .env.prod
test -f docker-compose.prod.yml
mkdir -p backups/mensuel backups/annuel
exec 9>backups/.backup.lock
flock -w 300 9
test ! -e "backups/$filename"
base=${filename%.dump}
uploads="$base.uploads.tar.gz"
partial=$(mktemp "backups/.${filename}.XXXXXX")
partial_uploads=$(mktemp "backups/.${uploads}.XXXXXX")
trap 'rm -f "$partial" "$partial_uploads"' EXIT
compose=(docker compose --env-file .env.prod -f docker-compose.prod.yml)

# 1. Base : export puis relecture complète du sommaire (un fichier tronqué échoue ici).
"${compose[@]}" exec -T postgres sh -ec 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' </dev/null > "$partial"
test -s "$partial"
"${compose[@]}" exec -T postgres pg_restore --list < "$partial" >/dev/null
mv "$partial" "backups/$filename"

# 2. Fichiers déposés (photos des motos…) : absents du dump, archivés à part puis relus.
if "${compose[@]}" exec -T backend tar -C /app/uploads -czf - . </dev/null > "$partial_uploads"; then
  tar -tzf "$partial_uploads" >/dev/null
  mv "$partial_uploads" "backups/$uploads"
else
  echo "Attention : fichiers déposés non archivés (service backend arrêté ?)" >&2
  rm -f "$partial_uploads"
fi

# 3. Conservation longue durée : liens physiques, aucune place disque en plus.
keep() {
  local target=$1
  [[ -e "$target.dump" ]] && return 0
  ln "backups/$filename" "$target.dump" 2>/dev/null || cp -p "backups/$filename" "$target.dump"
  if [[ -e "backups/$uploads" ]]; then
    ln "backups/$uploads" "$target.uploads.tar.gz" 2>/dev/null || cp -p "backups/$uploads" "$target.uploads.tar.gz"
  fi
  echo "Archive gardée : $target.dump"
}
if [[ "$filename" == kafontine_* ]]; then
  keep "backups/mensuel/$(date -u +%Y-%m)"
  keep "backups/annuel/$(date -u +%Y)"
fi

# 4. Nettoyage (jamais backups/annuel).
find backups -maxdepth 1 -type f \( -name 'kafontine_*.dump' -o -name 'kafontine_*.uploads.tar.gz' \) -mtime +"$daily_days" -delete
find backups -maxdepth 1 -type f \( -name 'pre_*.dump' -o -name 'pre_*.uploads.tar.gz' \) -mtime +"$pre_days" -delete
find backups/mensuel -maxdepth 1 -type f -mtime +"$monthly_days" -delete

# 5. Alerte disque : moins de 2 Go libres.
free_kb=$(df -Pk backups | awk 'NR==2 {print $4}')
if (( free_kb < 2 * 1024 * 1024 )); then
  echo "Attention : moins de 2 Go libres sur le disque des sauvegardes" >&2
fi
printf 'Backup verified: %s/backups/%s\n' "$app_dir" "$filename"
