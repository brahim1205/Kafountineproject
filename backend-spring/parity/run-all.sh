#!/usr/bin/env bash
# Rejoue tous les scénarios sur deux copies neuves de la base et compare réponses et données.
# Code de sortie non nul au moindre écart.
source "$(dirname "$0")/env.sh"
bash "$PARITY/start.sh" || exit 1
cd "$PARITY"
status=0
node diff.mjs scenarios/s-*.mjs | grep -v '^  ok' | cut -c1-500
[ "${PIPESTATUS[0]}" = 0 ] || status=1
python3 dbdiff.py | cut -c1-400
[ "${PIPESTATUS[0]}" = 0 ] || status=1
bash medias.sh 2>&1 | cut -c1-300
grep -q . "$DATA/out.3000" && cmp -s "$DATA/out.3000" "$DATA/out.3002" || status=1
exit $status
