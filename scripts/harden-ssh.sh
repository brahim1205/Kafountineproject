#!/usr/bin/env bash
# Durcit SSH sur le serveur de production : connexion par clé uniquement, mots de passe interdits.
# root reste joignable PAR CLÉ (prohibit-password) : les déploiements GitHub de Kafountine et de c2p
# se connectent en root avec une clé. À lancer en root sur le serveur :
#   ssh root@72.62.234.215 'bash -s' < scripts/harden-ssh.sh
# Avant de fermer votre session, ouvrez-en une NOUVELLE pour vérifier que la connexion par clé passe.
set -Eeuo pipefail

CONF=/etc/ssh/sshd_config.d/00-kafountine-hardening.conf
die() { printf 'ERREUR : %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "à lancer en root."
grep -qE '^\s*Include\s+/etc/ssh/sshd_config.d/\*\.conf' /etc/ssh/sshd_config \
  || die "sshd_config n'inclut pas sshd_config.d : réglage à faire à la main."

# Garde-fou : sans clé autorisée pour root, couper les mots de passe enfermerait dehors.
keys=$(grep -cE '^(ssh-|ecdsa-|sk-)' /root/.ssh/authorized_keys 2>/dev/null || true)
[[ ${keys:-0} -ge 1 ]] || die "aucune clé dans /root/.ssh/authorized_keys : ajoutez la vôtre avant de durcir."
printf 'Clés autorisées pour root : %s\n' "$keys"

backup=""
[[ -f $CONF ]] && { backup="$CONF.bak.$(date -u +%Y%m%dT%H%M%SZ)"; cp -a "$CONF" "$backup"; }

# sshd retient la PREMIÈRE valeur lue : le préfixe 00- passe avant 50-cloud-init.conf
# (qui active PasswordAuthentication).
cat > "$CONF" <<'EOF'
# Durcissement Kafountine (scripts/harden-ssh.sh)
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
EOF
chmod 0644 "$CONF"

if ! sshd -t; then
  rm -f "$CONF"; [[ -n $backup ]] && mv "$backup" "$CONF"
  die "configuration SSH invalide : rien n'a été changé."
fi

effective=$(sshd -T 2>/dev/null)
for expected in 'passwordauthentication no' 'permitrootlogin without-password' 'kbdinteractiveauthentication no'; do
  [[ $effective == *"$expected"* ]] || die "réglage non appliqué : $expected (vérifiez les fichiers de sshd_config.d)."
done

# Rechargement : les sessions ouvertes sont conservées.
systemctl reload ssh 2>/dev/null || systemctl reload sshd
printf 'SSH durci : clés uniquement, mots de passe refusés (root compris).\n'
printf 'Vérifiez MAINTENANT dans un autre terminal : ssh root@<serveur> echo ok\n'
printf 'Retour arrière : rm %s && systemctl reload ssh\n' "$CONF"
