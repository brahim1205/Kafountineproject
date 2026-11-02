#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0
# Seul fichier autorisé : noms de tables dynamiques, validés par quoteIdentifier().
allowlisted_dynamic_sql='backend/src/modules/parametres/infrastructure/PrismaBackupStore.ts'

echo "== SQL safety scan =="

while IFS= read -r file; do
  if [[ ! -f "$file" ]]; then
    continue
  fi

  if [[ "$file" == "$allowlisted_dynamic_sql" ]]; then
    continue
  fi

  if perl -0ne 'exit(/(?:\$queryRawUnsafe|\$executeRawUnsafe)(?:<[^>]+>)?\s*\(\s*`[^`]*\$\{/ ? 0 : 1)' "$file"; then
    echo "Unsafe raw SQL interpolation detected in $file" >&2
    failures=1
  fi
done < <(git ls-files 'backend/src/**/*.ts')

if [[ "$failures" -ne 0 ]]; then
  echo "SQL safety scan failed." >&2
  exit 1
fi

echo "SQL safety scan passed."
