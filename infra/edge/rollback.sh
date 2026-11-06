#!/usr/bin/env bash
# Annule install.sh : c2p reprend les ports 80/443 comme avant la séparation.
# Attention : Kafountine n'est alors plus servi sur orbyteconsulting.tech (état d'avant install.sh).
set -Eeuo pipefail

EDGE=${EDGE:-/opt/edge}
C2P=${C2P:-/opt/c2p}
KAF=${KAF:-/opt/kafontine}
BACKUP=${1:-$(cat "$EDGE/backup/last")}
[[ $EUID -eq 0 ]] || { echo "à lancer en root." >&2; exit 1; }
[[ -f $BACKUP/c2p-compose.production.env ]] || { echo "sauvegarde introuvable : $BACKUP" >&2; exit 1; }

docker compose -f "$EDGE/docker-compose.yml" down --remove-orphans
cp -a "$BACKUP/c2p-compose.production.env" "$C2P/ops/env/compose.production.env"
(cd "$C2P" && docker compose --env-file ops/env/compose.production.env -f docker-compose.production.yml up -d --no-deps --no-build reverse-proxy)
cp -a "$BACKUP/kafontine.env.prod" "$KAF/.env.prod"
(cd "$KAF" && docker compose --env-file .env.prod -f docker-compose.prod.yml -f .compose-images.yml up -d --no-deps --no-build frontend)
cp -a "$BACKUP/renewal.conf" /etc/letsencrypt/renewal/orbyteconsulting.tech.conf
[[ -f $BACKUP/renew-hook ]] && cp -a "$BACKUP/renew-hook" /etc/letsencrypt/renewal-hooks/deploy/renew-orbyte-kafontine
echo "État d'avant la séparation rétabli (sauvegarde $BACKUP)."
