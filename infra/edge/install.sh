#!/usr/bin/env bash
# Sépare c2p.sn et Kafountine (orbyteconsulting.tech) derrière le proxy frontal /opt/edge.
# À lancer en root sur le serveur, depuis /opt/edge, APRÈS le déploiement de la PR c2p
# « proxy frontal partagé » (écoute 8444 en PROXY protocol + réseau `edge`).
# En cas d'échec d'une vérification, tout est remis comme avant (voir rollback.sh).
set -Eeuo pipefail

EDGE=${EDGE:-/opt/edge}
C2P=${C2P:-/opt/c2p}
KAF=${KAF:-/opt/kafontine}
C2P_ENV=$C2P/ops/env/compose.production.env
KAF_ENV=$KAF/.env.prod
DOMAIN=orbyteconsulting.tech
LIVE=/etc/letsencrypt/live/$DOMAIN
RENEWAL=/etc/letsencrypt/renewal/$DOMAIN.conf
HOOK=/etc/letsencrypt/renewal-hooks/deploy/renew-orbyte-kafontine
BACKUP=$EDGE/backup/$(date -u +%Y%m%dT%H%M%SZ)
DOCKER_BRIDGE_IP=${DOCKER_BRIDGE_IP:-172.17.0.1}

log() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERREUR : %s\n' "$*" >&2; exit 1; }
edge() { docker compose -f "$EDGE/docker-compose.yml" "$@"; }
c2p() { (cd "$C2P" && docker compose --env-file "$C2P_ENV" -f docker-compose.production.yml "$@"); }
kaf() { (cd "$KAF" && docker compose --env-file .env.prod -f docker-compose.prod.yml -f .compose-images.yml "$@"); }
set_env() { # fichier clé valeur : remplace ou ajoute la ligne CLÉ=valeur
  if grep -q "^$2=" "$1"; then sed -i "s#^$2=.*#$2=$3#" "$1"; else printf '%s=%s\n' "$2" "$3" >> "$1"; fi
}

[[ $EUID -eq 0 ]] || die "à lancer en root."
[[ -f $EDGE/docker-compose.yml && -f $EDGE/nginx.conf && -f $EDGE/sites/kafontine.conf ]] || die "fichiers du proxy frontal absents de $EDGE."
[[ -f $C2P_ENV && -f $KAF_ENV && -f $KAF/.compose-images.yml ]] || die "c2p ou Kafountine introuvable."
[[ -f $LIVE/fullchain.pem ]] || die "certificat $DOMAIN introuvable dans $LIVE."

log "Vérification : c2p est prêt pour le proxy frontal"
c2p_conf=$(docker exec c2p-reverse-proxy-1 nginx -T 2>/dev/null || true)
[[ $c2p_conf == *'listen 8444 ssl proxy_protocol'* ]] \
  || die "le reverse proxy c2p n'écoute pas sur 8444 : déployez d'abord la PR c2p « proxy frontal partagé »."
c2p_networks=$(docker inspect c2p-reverse-proxy-1 --format '{{json .NetworkSettings.Networks}}')
[[ $c2p_networks == *'"c2p-proxy"'* ]] \
  || die "le reverse proxy c2p n'est pas sur le réseau edge avec l'alias c2p-proxy : déployez d'abord la PR c2p."

log "Sauvegarde de l'état actuel dans $BACKUP"
mkdir -p "$BACKUP"
cp -a "$C2P_ENV" "$BACKUP/c2p-compose.production.env"
cp -a "$KAF_ENV" "$BACKUP/kafontine.env.prod"
cp -a "$RENEWAL" "$BACKUP/renewal.conf"
[[ -f $HOOK ]] && cp -a "$HOOK" "$BACKUP/renew-hook"
echo "$BACKUP" > "$EDGE/backup/last"

rollback() {
  printf '\n!! Échec : retour à l'"'"'état précédent\n' >&2
  edge down --remove-orphans >/dev/null 2>&1 || true
  cp -a "$BACKUP/c2p-compose.production.env" "$C2P_ENV"
  c2p up -d --no-deps --no-build reverse-proxy || true
  cp -a "$BACKUP/kafontine.env.prod" "$KAF_ENV"
  kaf up -d --no-deps --no-build frontend || true
  cp -a "$BACKUP/renewal.conf" "$RENEWAL"
  [[ -f $BACKUP/renew-hook ]] && cp -a "$BACKUP/renew-hook" "$HOOK"
  printf '!! État précédent rétabli. Sauvegarde conservée : %s\n' "$BACKUP" >&2
}
trap 'rollback' ERR

log "Certificat $DOMAIN pour le proxy frontal"
install -d -m 0755 "$EDGE/certs/$DOMAIN" "$EDGE/certbot/www"
install -m 0644 "$LIVE/fullchain.pem" "$EDGE/certs/$DOMAIN/fullchain.pem"
install -m 0640 -g 101 "$LIVE/privkey.pem" "$EDGE/certs/$DOMAIN/privkey.pem"

log "Validation de la configuration du proxy frontal"
docker network inspect edge >/dev/null
edge pull -q
edge run --rm --no-deps proxy nginx -t

log "Kafountine : application publiée sur docker0 seulement ($DOCKER_BRIDGE_IP:8081), plus sur Internet"
set_env "$KAF_ENV" FRONT_PORT "$DOCKER_BRIDGE_IP:8081"
kaf up -d --no-deps --no-build frontend
for _ in $(seq 1 30); do curl -sf "http://$DOCKER_BRIDGE_IP:8081/ready" >/dev/null && break; sleep 2; done
curl -sf "http://$DOCKER_BRIDGE_IP:8081/ready" >/dev/null

log "Bascule : c2p libère les ports 80/443, le proxy frontal les prend"
set_env "$C2P_ENV" C2P_HTTP_PUBLISH 127.0.0.1:8880
set_env "$C2P_ENV" C2P_HTTPS_PUBLISH 127.0.0.1:8843
c2p up -d --no-deps --no-build reverse-proxy
edge up -d
sleep 3

log "Vérifications"
check_cert() {
  local served
  served=$(echo | openssl s_client -connect 127.0.0.1:443 -servername "$1" 2>/dev/null | openssl x509 -noout -ext subjectAltName)
  [[ $served == *"DNS:$1"* ]]
}
check_cert "$DOMAIN"
check_cert c2p.sn
ready=$(curl -sf --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/ready")
[[ $ready == *'"ready"'* ]]
code=$(curl -s -o /dev/null -w '%{http_code}' --resolve "c2p.sn:443:127.0.0.1" https://c2p.sn/)
[[ $code =~ ^(2|3) ]]
code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" http://127.0.0.1/)
[[ $code == 301 ]]
printf 'orbyteconsulting.tech et c2p.sn répondent, chacun avec son certificat.\n'

log "Renouvellement du certificat $DOMAIN : webroot et rechargement du proxy frontal"
sed -i -e "s#^webroot_path = .*#webroot_path = $EDGE/certbot/www,#" \
       -e "s#^\($DOMAIN\|www.$DOMAIN\) = .*#\1 = $EDGE/certbot/www#" "$RENEWAL"
cat > "$HOOK" <<HOOK_EOF
#!/bin/sh
# Installe le certificat $DOMAIN renouvelé dans le proxy frontal (/opt/edge) puis le recharge.
set -eu
[ "\${RENEWED_LINEAGE:-}" = $LIVE ] || exit 0
install -m 0644 "\$RENEWED_LINEAGE/fullchain.pem" $EDGE/certs/$DOMAIN/fullchain.pem
install -m 0640 -g 101 "\$RENEWED_LINEAGE/privkey.pem" $EDGE/certs/$DOMAIN/privkey.pem
docker exec edge-proxy nginx -t
docker exec edge-proxy nginx -s reload
HOOK_EOF
chmod 0755 "$HOOK"
trap - ERR
if certbot renew --cert-name "$DOMAIN" --dry-run >/dev/null 2>&1; then
  printf 'Renouvellement testé (dry-run) : OK.\n'
else
  printf 'ATTENTION : le test de renouvellement a échoué ; le site fonctionne, mais lancez\n  certbot renew --cert-name %s --dry-run\npour voir le détail avant l'"'"'échéance du certificat.\n' "$DOMAIN"
fi

log "Terminé"
cat <<EOF
- Ports 80/443 : proxy frontal /opt/edge (conteneur edge-proxy).
- c2p.sn : inchangé (TLS et certificats chez c2p), joint par le réseau edge.
- orbyteconsulting.tech : $EDGE/sites/kafontine.conf, certificat $EDGE/certs/$DOMAIN.
- Retour arrière : $EDGE/rollback.sh (sauvegarde : $BACKUP).
EOF
