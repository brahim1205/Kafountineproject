#!/usr/bin/env bash
# Remise à zéro des données de démonstration avant l'ouverture aux utilisateurs.
#   ssh root@72.62.234.215 'bash -s -- --je-confirme' < scripts/reset-demo-data.sh
#
# CONSERVE : tarifs, pénalités, permissions, catalogue des taxes (Paramètres) et le compte super admin,
#            qui reçoit un NOUVEAU mot de passe aléatoire (affiché une seule fois) : l'ancien mot de
#            passe de démonstration ne fonctionne plus.
# SUPPRIME : contribuables, tickets, actes, dossiers, marché, motos, quai de pêche, budget, formations,
#            journal d'audit, notifications, sauvegardes internes, compteurs de numéros, comptes de démo.
# Une sauvegarde complète (pg_dump) est faite avant ; tout se fait en une transaction.
set -Eeuo pipefail

APP_DIR=${APP_DIR:-/opt/kafontine}
SUPER_ADMIN_EMAIL=${SUPER_ADMIN_EMAIL:-superadmin@kafountine.gouv.sn}
die() { printf 'ERREUR : %s\n' "$*" >&2; exit 1; }

[[ ${1:-} == --je-confirme ]] || die "opération irréversible (hors sauvegarde) : relancez avec --je-confirme."

# Accès à la base : conteneur de production par défaut, PSQL/PG_DUMP pour un essai local.
if [[ -z ${PSQL:-} ]]; then
  cd "$APP_DIR"
  compose=(docker compose --env-file .env.prod -f docker-compose.prod.yml)
  PSQL="${compose[*]} exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" \"\$@\"' psql"
  PG_DUMP="${compose[*]} exec -T postgres sh -c 'pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Fc'"
fi
psql_run() { eval "$PSQL" '"$@"'; }

sql_email=${SUPER_ADMIN_EMAIL//\'/\'\'}
users=$(psql_run -At -c 'SELECT count(*) FROM "User"')
super=$(printf "SELECT count(*) FROM \"User\" WHERE email = '%s' AND role = 'SUPER_ADMIN';\n" "$sql_email" | psql_run -At)
[[ $super == 1 ]] || die "compte super admin $SUPER_ADMIN_EMAIL introuvable : rien n'a été modifié."
printf 'Comptes actuels : %s (le super admin %s sera conservé)\n' "$users" "$SUPER_ADMIN_EMAIL"

backup_dir=${BACKUP_DIR:-$APP_DIR/backups}
install -d -m 700 "$backup_dir"
backup="$backup_dir/avant_reset_demo_$(date -u +%Y%m%dT%H%M%SZ).dump"
eval "$PG_DUMP" > "$backup"
[[ -s $backup ]] || die "sauvegarde vide : rien n'a été modifié."
chmod 600 "$backup"
printf 'Sauvegarde : %s\n' "$backup"

# Mot de passe conforme à la politique (12 caractères et plus, majuscule, minuscule, chiffre, spécial).
password="$(head -c 18 /dev/urandom | base64 | tr -d '/+=' | cut -c1-16)Ka7!"

psql_run -At <<SQL
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
TRUNCATE
  "Transaction", "NumeroCounter",
  "BudgetLine", "BudgetRequest",
  "AuditLog", "AppNotification", "BackupRecord",
  "EtatCivilRequest", "UrbanismeCase",
  "MarketPayment", "MarketPlace",
  "MotoPayment", "MotoRegistration",
  "YouthEnrollment", "YouthProfile", "TrainingProgram",
  "FishCommission", "FishingBoat", "Fisherman",
  "ShippingExpedition", "RefrigeratedTruck",
  "Contribuable";
DELETE FROM "User" WHERE email <> '${sql_email}';
UPDATE "User" SET password = crypt('${password}', gen_salt('bf', 10)), "updatedAt" = now()
  WHERE email = '${sql_email}';
COMMIT;
SQL

printf '\nContrôle :\n'
psql_run -At -F ' : ' <<'SQL'
SELECT 'comptes', string_agg(email || ' (' || role || ')', ', ') FROM "User"
UNION ALL SELECT 'contribuables', count(*)::text FROM "Contribuable"
UNION ALL SELECT 'tickets', count(*)::text FROM "Transaction"
UNION ALL SELECT 'tarifs conservés', count(*)::text FROM "AppSettingTariff"
UNION ALL SELECT 'catalogue conservé', count(*)::text FROM "MunicipalTariffItem";
SQL

# Sessions ouvertes avec les anciens comptes : déconnectées (sessions dans Redis).
if [[ -n ${compose+x} ]]; then
  "${compose[@]}" exec -T redis sh -c 'redis-cli ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} --no-auth-warning FLUSHDB' >/dev/null 2>&1 \
    && printf 'Sessions ouvertes : fermées.\n' || printf 'Sessions : à fermer en redémarrant le backend.\n'
fi

cat <<EOF

=====================================================================
 Nouveau mot de passe de $SUPER_ADMIN_EMAIL :

     $password

 Notez-le maintenant (il n'est affiché qu'une fois), connectez-vous,
 puis changez-le dans « Mon profil ». Créez ensuite les vrais comptes.
=====================================================================
EOF
