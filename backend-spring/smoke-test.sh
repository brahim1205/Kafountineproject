#!/usr/bin/env bash
# Parcours rapide sur un serveur de développement : crée puis supprime ses propres données.
# À ne pas lancer en production (le portail y envoie de vrais SMS et ne renvoie pas de code).
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
ORIGIN="${SMOKE_ORIGIN:-http://127.0.0.1:5173}"
EMAIL="${SMOKE_EMAIL:-superadmin@kafountine.gouv.sn}"
PASSWORD="${SMOKE_PASSWORD:?Définir SMOKE_PASSWORD}"
JAR="$(mktemp)"; PORTAL_JAR="$(mktemp)"
trap 'rm -f "$JAR" "$PORTAL_JAR"' EXIT
API="$BASE_URL/api/v1"
STAMP="$(date +%s)"

field() { node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).$1"; }
call() { # méthode chemin [corps]
  curl -fsS -b "$JAR" -c "$JAR" -X "$1" "$API$2" -H "Origin: $ORIGIN" -H 'Content-Type: application/json' ${3:+-d "$3"}
}
portal() {
  curl -fsS -b "$PORTAL_JAR" -c "$PORTAL_JAR" -X "$1" "$API/portal$2" -H "Origin: $ORIGIN" -H 'Content-Type: application/json' ${3:+-d "$3"}
}

curl -fsS "$BASE_URL/ready" >/dev/null
call POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" >/dev/null
call GET /auth/me >/dev/null
call GET /transactions/categories >/dev/null

FORMATION="$(call POST /formations '{"nom":"SMOKE","domaine":"Test","duree":"1 jour","responsable":"Smoke","budget":1,"dateDebut":"2026-10-06","dateFin":"2026-10-07"}' | field data.id)"
call DELETE "/formations/$FORMATION" >/dev/null

USER_ID="$(call POST /users "{\"email\":\"smoke-$STAMP@example.local\",\"password\":\"Smoke-Passe-$STAMP!\",\"nom\":\"Smoke\",\"prenom\":\"Spring\",\"role\":\"AGENT\"}" | field data.id)"
call DELETE "/users/$USER_ID" >/dev/null

NIN="SMOKE-$STAMP"; PHONE="+22177$STAMP"
CONTRIBUABLE="$(call POST /contribuables "{\"nin\":\"$NIN\",\"nom\":\"Smoke\",\"prenom\":\"Portail\",\"dateNaiss\":\"1990-01-01\",\"lieuNaiss\":\"Kafountine\",\"adresse\":\"Test\",\"telephone\":\"$PHONE\"}" | field data.id)"
TICKET="$(call POST /transactions "{\"contribuableId\":\"$CONTRIBUABLE\",\"type\":\"test\",\"service\":\"Smoke\",\"montant\":25,\"statut\":\"EN_ATTENTE\"}" | field data.id)"

CHALLENGE="$(portal POST /auth/request-otp "{\"nin\":\"$NIN\",\"telephone\":\"$PHONE\"}")"
REQUEST_ID="$(printf '%s' "$CHALLENGE" | field data.requestId)"
CODE="$(printf '%s' "$CHALLENGE" | field data.devCode)"
portal POST /auth/verify-otp "{\"requestId\":\"$REQUEST_ID\",\"code\":\"$CODE\"}" >/dev/null
portal GET /auth/me >/dev/null
portal GET "/contribuable/$CONTRIBUABLE/taxes" >/dev/null
PAYMENT="$(portal POST /payment/initiate "{\"amount\":25,\"taxes\":[\"$TICKET\"],\"method\":\"wave\",\"phone\":\"$PHONE\"}" | field paymentId)"
portal POST /payment/confirm "{\"transactionId\":\"$PAYMENT\",\"reference\":\"SMOKE\"}" >/dev/null
portal GET "/recu/$TICKET" >/dev/null

call DELETE "/transactions/$TICKET" >/dev/null
call DELETE "/contribuables/$CONTRIBUABLE" >/dev/null
echo "SPRING_SMOKE=ok"
