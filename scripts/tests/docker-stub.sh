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
  *'/ready'*) [[ "${STUB_FAIL:-}" != readiness ]] ;;
esac
