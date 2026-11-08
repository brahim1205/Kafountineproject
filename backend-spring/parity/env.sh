# Variables communes du banc de comparaison Node / Spring.
DATA=${KAF_PARITY_DATA:-$HOME/Bureau/kodify/.kaf-parity}
PARITY=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(cd "$PARITY/../.." && pwd)
PGBIN=/usr/lib/postgresql/16/bin
export PATH=$HOME/.nvm/versions/node/v22.17.1/bin:$PGBIN:$PATH
export PGHOST=127.0.0.1 PGPORT=55432 PGUSER=postgres
# Secrets jetables, propres à chaque exécution du banc.
jwt_access=$(openssl rand -hex 32)
jwt_refresh=$(openssl rand -hex 32)
export JWT_SECRET=${jwt_access}
export JWT_REFRESH_SECRET=${jwt_refresh}
# Services locaux du banc, sans mot de passe.
pg_url() { printf '%s://%s@127.0.0.1:55432/%s?schema=public' postgresql postgres "$1"; }
redis_url() { printf '%s://127.0.0.1:56379/%s' redis "$1"; }
export NODE_ENV=development CORS_ORIGIN=http://127.0.0.1:5173 PORTAL_URL=http://127.0.0.1:5173 SEED_DEFAULT_PASSWORD='TestPassword123!'
JAVA_BIN=${JAVA_HOME_17_X64:+$JAVA_HOME_17_X64/bin/java}
JAVA_BIN=${JAVA_BIN:-/usr/lib/jvm/java-17-openjdk-amd64/bin/java}
