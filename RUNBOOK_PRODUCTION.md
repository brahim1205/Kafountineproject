# Runbook Production

## 1. Préparation

1. Remplir [`.env.prod`](./.env.prod) avec des valeurs réelles.
2. Vérifier que les secrets GitHub Actions sont présents.
3. Lancer `bash ./scripts/prod-preflight.sh .env.prod`.
4. Vérifier l’accès au serveur : `ssh root@72.62.234.215 'docker ps'`.

## 2. Déploiement

1. Déclencher [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).
2. Vérifier que le job `deploy` passe.
3. Vérifier les conteneurs : `ssh root@72.62.234.215 'cd /opt/kafontine && docker compose -f docker-compose.prod.yml ps'`.
4. Lancer `bash ./scripts/smoke-prod.sh https://votre-domaine`.

## 3. Vérifications post-déploiement

1. Vérifier `/health` et `/ready`.
2. Vérifier le login web.
3. Vérifier un parcours métier critique.
4. Vérifier les logs backend : `ssh root@72.62.234.215 'cd /opt/kafontine && docker compose -f docker-compose.prod.yml logs --tail=200 backend'`.

## 4. Backup

1. Déclencher [`.github/workflows/backup.yml`](./.github/workflows/backup.yml).
2. Vérifier que l’artefact GitHub a bien été généré.
3. Vérifier la présence du dump sur le serveur.

## 5. Restauration

1. Déclencher [`.github/workflows/disaster-recovery.yml`](./.github/workflows/disaster-recovery.yml) avec `restore-latest` ou `restore-from-artifact`.
2. Vérifier `/ready` après restauration.
3. Refaire un smoke test HTTP.

## 6. Rollback

1. Identifier le tag image cible.
2. Déclencher [`.github/workflows/rollback.yml`](./.github/workflows/rollback.yml).
3. Vérifier les conteneurs : `ssh root@72.62.234.215 'cd /opt/kafontine && docker compose -f docker-compose.prod.yml ps'`.
4. Vérifier `/ready` puis relancer le smoke test.

## 7. Incident critique

1. Stopper les changements applicatifs.
2. Capturer l’état courant: logs, version, heure, impact.
3. Choisir entre rollback applicatif et restauration DB.
4. Vérifier le service après action.
5. Documenter l’incident.

## Mise en service : données de démonstration

Avant d'ouvrir l'application aux agents, la base de production ne doit contenir aucune donnée de
démonstration (comptes `agent@`, `admin@`… et leur mot de passe de démo, contribuables et tickets fictifs).

```bash
ssh root@72.62.234.215 'bash -s -- --je-confirme' < scripts/reset-demo-data.sh
```

Le script sauvegarde la base (`/opt/kafontine/backups/avant_reset_demo_*.dump`), vide toutes les données
métier, supprime les comptes de démo, conserve les paramètres (tarifs, pénalités, permissions, catalogue)
et donne au compte `superadmin@kafountine.gouv.sn` un mot de passe aléatoire, affiché une seule fois.
Se connecter aussitôt, changer ce mot de passe dans « Mon profil », puis créer les vrais comptes.

## Sécurité du serveur : SSH

Connexion par clé uniquement ; `root` reste joignable par clé (les déploiements GitHub de Kafountine
et de c2p se connectent en root avec une clé).

```bash
ssh root@72.62.234.215 'bash -s' < scripts/harden-ssh.sh
ssh root@72.62.234.215 echo ok   # dans un NOUVEAU terminal, avant de fermer la session en cours
```

Le script refuse de s'appliquer si `/root/.ssh/authorized_keys` est vide (risque de s'enfermer dehors)
et vérifie la configuration (`sshd -t`, `sshd -T`) avant de recharger SSH. Retour arrière :
`rm /etc/ssh/sshd_config.d/00-kafountine-hardening.conf && systemctl reload ssh`.

## Sauvegardes chiffrées

Chaque nuit (02:00), `.github/workflows/backup.yml` sauvegarde la base, vérifie la sauvegarde, la
copie hors du serveur (artefact GitHub, 30 jours) et la **chiffre avec age** avant l'envoi : elle
contient des données personnelles (NIN, téléphones).

Mise en place (une fois, sur un poste de confiance) :

```bash
age-keygen -o kafountine-sauvegardes.key        # affiche la clé publique « age1… »
gh secret set BACKUP_AGE_RECIPIENT --env production --body 'age1…'          # clé publique
gh secret set BACKUP_AGE_IDENTITY --env production < kafountine-sauvegardes.key  # pour la reprise d'activité
```

Conserver `kafountine-sauvegardes.key` hors ligne (clé USB au coffre de la mairie, gestionnaire de
mots de passe). Sans elle, les sauvegardes chiffrées sont illisibles. Le dépôt étant public, tout
compte GitHub connecté peut télécharger les artefacts : si `BACKUP_AGE_RECIPIENT` manque, le workflow
échoue et ne publie rien (la sauvegarde reste sur le serveur, `backups/`, 14 jours).

Restauration manuelle d'un artefact : `age -d -i kafountine-sauvegardes.key -o base.dump base.dump.age`,
puis la procédure de restauration ci-dessus. Le workflow « Disaster Recovery » déchiffre lui-même
avec `BACKUP_AGE_IDENTITY`.
