#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin" "$tmp/app"
cp "$repo/scripts/tests/docker-stub.sh" "$tmp/bin/docker"
chmod +x "$tmp/bin/docker"
ln -s /bin/true "$tmp/bin/sleep"
export PATH="$tmp/bin:$PATH"
export STUB_LOG="$tmp/docker.log"
touch "$tmp/app/.env.prod" "$tmp/app/docker-compose.prod.yml"

bash "$repo/scripts/backup-production.sh" "$tmp/app" kafontine_ok.dump
test -s "$tmp/app/backups/kafontine_ok.dump"
tar -tzf "$tmp/app/backups/kafontine_ok.uploads.tar.gz" | grep -q upload-1.jpg
test -e "$tmp/app/backups/mensuel/$(date -u +%Y-%m).dump"
test -e "$tmp/app/backups/annuel/$(date -u +%Y).uploads.tar.gz"
# Backend arrêté : la base est quand même sauvegardée, sans archive de photos.
STUB_FAIL=uploads bash "$repo/scripts/backup-production.sh" "$tmp/app" kafontine_sans_photos.dump
test -s "$tmp/app/backups/kafontine_sans_photos.dump"
test ! -e "$tmp/app/backups/kafontine_sans_photos.uploads.tar.gz"
# Une sauvegarde avant déploiement ne remplace pas les archives longue durée.
bash "$repo/scripts/backup-production.sh" "$tmp/app" pre_deploy_1.dump
test "$(find "$tmp/app/backups/mensuel" -name '*.dump' | wc -l)" -eq 1
for failure in dump archive; do
  if STUB_FAIL=$failure bash "$repo/scripts/backup-production.sh" "$tmp/app" "kafontine_$failure.dump"; then
    echo "Expected backup failure: $failure" >&2
    exit 1
  fi
  test ! -e "$tmp/app/backups/kafontine_$failure.dump"
done
if bash "$repo/scripts/backup-production.sh" "$tmp/app" ../escape.dump; then exit 1; fi
test -z "$(find "$tmp/app/backups" -name '.*.dump.*' -print)"
test -z "$(find "$tmp/app/backups" -name '.*.uploads.tar.gz.*' -print)"

for service in front frontend; do
  : > "$STUB_LOG"
  STUB_FRONT=$service bash "$repo/scripts/deploy-images.sh" "$tmp/app" registry/app-backend:abc registry/app-frontend:abc
  grep -q "pull backend $service" "$STUB_LOG"
  grep -q 'prisma migrate deploy' "$STUB_LOG"
  grep -q "$service:" "$tmp/app/.compose-images.yml"
  if grep -q 'system prune\|otel-collector' "$STUB_LOG"; then exit 1; fi
done

: > "$STUB_LOG"
bash "$repo/scripts/deploy-images.sh" "$tmp/app" registry/app-backend:previous registry/app-frontend:previous rollback
if grep -q 'prisma migrate deploy' "$STUB_LOG"; then exit 1; fi
cp "$tmp/app/.compose-images.yml" "$tmp/last-success.yml"
if STUB_FAIL=readiness bash "$repo/scripts/deploy-images.sh" "$tmp/app" registry/app-backend:broken registry/app-frontend:broken; then exit 1; fi
cmp "$tmp/last-success.yml" "$tmp/app/.compose-images.yml"
printf 'PRODUCTION_SCRIPT_TESTS=ok\n'
