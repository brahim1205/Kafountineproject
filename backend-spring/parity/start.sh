#!/usr/bin/env bash
# Deux copies identiques de kaf_seeded : Node (3000, redis db1) sur kaf_dn, Spring (3002, redis db2) sur kaf_ds.
source "$(dirname "$0")/env.sh"
for d in kaf_dn kaf_ds; do psql -q -d postgres -c "DROP DATABASE IF EXISTS $d WITH (FORCE)" 2>/dev/null; psql -q -d postgres -c "CREATE DATABASE $d TEMPLATE kaf_seeded"; done
redis-cli -p 56379 -n 1 flushdb >/dev/null; redis-cli -p 56379 -n 2 flushdb >/dev/null
node_db=$(pg_url kaf_dn)
spring_db=$(pg_url kaf_ds)
for port in 3000 3002; do
  pid=$(ss -ltnp | grep ":$port " | grep -o "pid=[0-9]*" | head -1 | cut -d= -f2)
  [ -n "$pid" ] && kill "$pid" 2>/dev/null
  for i in $(seq 1 20); do ss -ltn | grep -q ":$port " || break; sleep 0.5; done
done
mkdir -p "$DATA/spring-cwd"
(cd "$ROOT/backend" && DATABASE_URL=${node_db} REDIS_URL="$(redis_url 1)" PORT=3000 WEB_CONCURRENCY=1 setsid nohup npx tsx src/index.ts > "$DATA/node.log" 2>&1 < /dev/null &)
(cd "$DATA/spring-cwd" && DATABASE_URL=${spring_db} REDIS_URL="$(redis_url 2)" PORT=3002 setsid nohup /usr/lib/jvm/java-17-openjdk-amd64/bin/java -jar "$ROOT/backend-spring/target/gestion-municipale-spring-1.0.0.jar" > "$DATA/spring.log" 2>&1 < /dev/null &)
for port in 3000 3002; do
  ok=; for i in $(seq 1 120); do curl -sf http://127.0.0.1:$port/health >/dev/null && { ok=1; break; }; sleep 1; done
  [ -n "$ok" ] || { echo "port $port KO"; tail -5 "$DATA/node.log" "$DATA/spring.log"; exit 1; }
done
echo "node et spring prêts"
