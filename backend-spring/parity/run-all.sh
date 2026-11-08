#!/usr/bin/env bash
# Rejoue tous les scénarios sur deux copies neuves de la base et compare réponses et données.
source "$(dirname "$0")/env.sh"
bash "$PARITY/start.sh" || exit 1
cd "$PARITY"
node diff.mjs scenarios/s-*.mjs | grep -v '^  ok' | cut -c1-500
python3 dbdiff.py | cut -c1-400
bash medias.sh 2>&1 | cut -c1-300
