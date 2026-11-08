# Variables communes du banc de comparaison Node / Spring.
DATA=${KAF_PARITY_DATA:-$HOME/Bureau/kodify/.kaf-parity}
PARITY=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(cd "$PARITY/../.." && pwd)
PGBIN=/usr/lib/postgresql/16/bin
export PATH=$HOME/.nvm/versions/node/v22.17.1/bin:$PGBIN:$PATH
export PGHOST=127.0.0.1 PGPORT=55432 PGUSER=postgres
export JWT_SECRET=x_test_secret_32_chars_minimum_aaaa JWT_REFRESH_SECRET=y_test_secret_32_chars_minimum_bbbb
export NODE_ENV=development CORS_ORIGIN=http://127.0.0.1:5173 PORTAL_URL=http://127.0.0.1:5173 SEED_DEFAULT_PASSWORD='TestPassword123!'
