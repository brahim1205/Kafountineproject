#!/usr/bin/env bash
# Démarre Postgres (55432) et Redis (56379) locaux et prépare la base de départ kaf_seeded.
source "$(dirname "$0")/env.sh"
set -e
mkdir -p "$DATA"
[ -d "$DATA/pg" ] || initdb -D "$DATA/pg" -U postgres -A trust -E UTF8 >/dev/null
pg_ctl -D "$DATA/pg" status >/dev/null 2>&1 || pg_ctl -D "$DATA/pg" -o "-p 55432 -c listen_addresses=127.0.0.1 -k $DATA" -l "$DATA/pg.log" -w start >/dev/null
redis-cli -p 56379 ping >/dev/null 2>&1 || redis-server --port 56379 --daemonize yes --save '' --dir "$DATA" >/dev/null
if ! psql -qAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='kaf_seeded'" | grep -q 1; then
  psql -q -d postgres -c 'CREATE DATABASE kaf_seeded'
  cd "$ROOT/backend"
  export DATABASE_URL="postgresql://postgres@127.0.0.1:55432/kaf_seeded?schema=public" REDIS_URL=redis://127.0.0.1:56379/9
  npx prisma migrate deploy >/dev/null
  npx tsx prisma/seed.ts >/dev/null
fi
echo "banc prêt"
