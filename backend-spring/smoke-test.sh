#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
EMAIL="${SMOKE_EMAIL:-admin@kafountine.gouv.sn}"
PASSWORD="${SMOKE_PASSWORD:-password123}"

curl -fsS "$BASE_URL/ready" >/dev/null

TOKEN="$(
  curl -fsS -X POST "$BASE_URL/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).data.accessToken'
)"

curl -fsS "$BASE_URL/api/v1/transactions/categories" \
  -H "Authorization: Bearer $TOKEN" >/dev/null

CREATED="$(
  curl -fsS -X POST "$BASE_URL/api/v1/formations" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"nom":"SMOKE SPRING TEMP","domaine":"Test","duree":"1 jour","responsable":"Codex","budget":1,"dateDebut":"2026-10-06","dateFin":"2026-10-07","statut":"PLANIFIEE","year":2026}'
)"

ID="$(printf '%s' "$CREATED" | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).data.id')"

curl -fsS -X DELETE "$BASE_URL/api/v1/formations/$ID" \
  -H "Authorization: Bearer $TOKEN" >/dev/null

USER_EMAIL="spring-smoke-$(date +%s)@example.local"
CREATED_USER="$(
  curl -fsS -X POST "$BASE_URL/api/v1/users" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$USER_EMAIL\",\"password\":\"password123\",\"nom\":\"Smoke\",\"prenom\":\"Spring\",\"role\":\"AGENT\",\"isActive\":true}"
)"

USER_ID="$(printf '%s' "$CREATED_USER" | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).data.id')"

curl -fsS "$BASE_URL/api/v1/users?search=$USER_EMAIL" \
  -H "Authorization: Bearer $TOKEN" >/dev/null

curl -fsS -X DELETE "$BASE_URL/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" >/dev/null

PORTAL_NIN="SMOKE-NIN-$(date +%s)"
PORTAL_PHONE="77$(date +%s | tail -c 8)"
CREATED_CONTRIBUABLE="$(
  curl -fsS -X POST "$BASE_URL/api/v1/contribuables" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"nin\":\"$PORTAL_NIN\",\"nom\":\"Smoke\",\"prenom\":\"Portal\",\"dateNaiss\":\"1990-01-01\",\"lieuNaiss\":\"Kafountine\",\"adresse\":\"Test\",\"telephone\":\"$PORTAL_PHONE\",\"typeContribuable\":\"PARTICULIER\",\"montantImpot\":0,\"isActive\":true}"
)"

CONTRIBUABLE_ID="$(printf '%s' "$CREATED_CONTRIBUABLE" | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).data.id')"

CREATED_TX="$(
  curl -fsS -X POST "$BASE_URL/api/v1/transactions" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"contribuableId\":\"$CONTRIBUABLE_ID\",\"categorie\":\"test\",\"service\":\"Smoke portal\",\"quantite\":1,\"montant\":25,\"tarifUnitaire\":25,\"modePaiement\":\"ESPECE\",\"statut\":\"EN_ATTENTE\",\"date\":\"2026-10-07\"}"
)"

TX_ID="$(printf '%s' "$CREATED_TX" | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).data.id')"

PORTAL_TOKEN="$(
  curl -fsS -X POST "$BASE_URL/api/v1/portal/auth/contribuable" \
    -H 'Content-Type: application/json' \
    -d "{\"nin\":\"$PORTAL_NIN\"}" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).token'
)"

curl -fsS "$BASE_URL/api/v1/portal/auth/me" \
  -H "Authorization: Bearer $PORTAL_TOKEN" >/dev/null

curl -fsS "$BASE_URL/api/v1/portal/contribuable/$CONTRIBUABLE_ID/taxes" \
  -H "Authorization: Bearer $PORTAL_TOKEN" >/dev/null

PAYMENT_ID="$(
  curl -fsS -X POST "$BASE_URL/api/v1/portal/payment/initiate" \
    -H "Authorization: Bearer $PORTAL_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"taxes\":[\"$TX_ID\"],\"method\":\"wave\",\"phone\":\"$PORTAL_PHONE\"}" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).paymentId'
)"

curl -fsS -X POST "$BASE_URL/api/v1/portal/payment/confirm" \
  -H "Authorization: Bearer $PORTAL_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"transactionId\":\"$PAYMENT_ID\",\"reference\":\"SMOKE\"}" >/dev/null

curl -fsS "$BASE_URL/api/v1/portal/recu/$TX_ID" \
  -H "Authorization: Bearer $PORTAL_TOKEN" >/dev/null

curl -fsS -X DELETE "$BASE_URL/api/v1/contribuables/$CONTRIBUABLE_ID" \
  -H "Authorization: Bearer $TOKEN" >/dev/null

echo "SPRING_SMOKE=ok"
