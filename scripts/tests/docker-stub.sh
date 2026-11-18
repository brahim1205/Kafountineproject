#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$STUB_LOG"
case " $* " in
  *' config --services '*) printf 'postgres\nredis\nbackend\n%s\n' "${STUB_FRONT:-frontend}" ;;
  *'pg_dump '*)
    printf 'test archive\n'
    [[ "${STUB_FAIL:-}" != dump ]]
    ;;
  *'pg_restore --list '*)
    cat >/dev/null
    [[ "${STUB_FAIL:-}" != archive ]]
    ;;
  *' tar -C /app/uploads '*)
    [[ "${STUB_FAIL:-}" != uploads ]]
    dir=$(mktemp -d); printf 'photo\n' > "$dir/upload-1.jpg"; tar -C "$dir" -czf - . ; rm -rf "$dir"
    ;;
  *'/ready'*) [[ "${STUB_FAIL:-}" != readiness ]] ;;
esac
