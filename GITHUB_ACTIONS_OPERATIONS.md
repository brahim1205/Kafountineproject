# GitHub Actions et sauvegardes

## Production verifiee

- Serveur : `72.62.234.215`, application dans `/opt/kafontine`.
- Site : `https://orbyteconsulting.tech/`.
- Disponibilite : `https://orbyteconsulting.tech/ready`.
- Backend actuellement deploye : Node.js.
- Les services du serveur sont `backend`, `frontend`, `postgres`, `redis`.
  Le script de deploiement accepte aussi le service `front` du Compose local.

## Configuration GitHub requise

Dans l'environnement GitHub Actions `production` :

| Secret / variable | Valeur attendue |
| --- | --- |
| Secret `SSH_HOST` | `72.62.234.215` |
| Secret `SSH_USERNAME` | Utilisateur autorise a utiliser Docker sur le serveur |
| Secret `SSH_KEY` | Cle privee de deploiement correspondante |
| Secret `SSH_KNOWN_HOSTS` | Facultatif pour ce serveur ; sa cle publique verifiee est dans `infra/ssh/known_hosts` |
| Variable `APP_DIR` | `/opt/kafontine` par defaut |
| Secret `HEALTH_URL` | `https://orbyteconsulting.tech/ready` |
| Registre d'images | `ghcr.io/brahim1205/kafontine-backend` et `kafontine-frontend`, authentification par `GITHUB_TOKEN` |

Les secrets SonarQube `SONAR_HOST_URL` et `SONAR_TOKEN` doivent etre accessibles
au workflow SonarQube (secrets du depot). Le scanner est ignore s'ils sont absents.
Ne jamais committer de cle privee, jeton ou fichier `.env.prod`.

## Sauvegardes

`Database Backup` effectue un dump PostgreSQL complet au format custom, verifie
son catalogue, puis le telecharge du serveur par SCP et le publie comme artifact
GitHub `database-backup` pendant 30 jours. Les fichiers incomplets ne sont pas
publies. Les sauvegardes ordinaires du serveur sont conservees 14 jours ; les
sauvegardes avant deploiement/restauration sont conservees pour intervention manuelle.

Un timer systemd independant de GitHub est installe sur le serveur :

```bash
systemctl list-timers kafontine-backup.timer
journalctl -u kafontine-backup.service
systemctl start kafontine-backup.service
```

Il s'execute tous les jours vers 02:00 UTC (delai aleatoire de 5 minutes maximum).
Il conserve les dumps sur le serveur : ce n'est pas une copie hors serveur.
Le transfert vers les artifacts GitHub est assure par le workflow quotidien.
Une copie distincte des uploads est egalement
necessaire pour une reprise complete de tous les fichiers de l'application.

## Restauration et deploiement

- `Disaster Recovery / status` verifie les sauvegardes et la disponibilite.
- `full-backup` reutilise le workflow de sauvegarde, avec un artifact distinct.
- Les restaurations exigent `confirm_restore=RESTORE`, sauvegardent les donnees
  courantes et utilisent une transaction PostgreSQL unique.
- `Deploy Production` verifie et publie les images sur les pushes vers main.
  Le deploiement effectif exige un lancement manuel avec `deploy=true` ou un tag
  de version `v*`. Il sauvegarde la base puis utilise les images du commit.
  L'absence de secrets necessaires fait echouer explicitement le workflow.
- `Rollback Production` utilise un tag existant, sans rejouer les migrations.
  La compatibilite de l'ancienne application avec le schema courant doit etre verifiee.
- Apres une livraison reussie, `.compose-images.yml` conserve les images choisies
  et `.compose-images.previous.yml` les precedentes. Pour un redemarrage manuel,
  ajouter `-f .compose-images.yml` a la commande Compose de production.
- Les modifications de production sont serialisees. Aucun nettoyage Docker global
  n'est lance sur le serveur partage avec C2P.

## Verifications du 30 octobre 2026

- Dump reel cree et restaure dans un conteneur PostgreSQL isole : 28 tables.
  Le conteneur de verification a ensuite ete supprime, sans toucher a la base active.
- Timer systemd installe et premiere execution reussie.
- Tests de scripts : echec de dump, archive invalide, noms de fichiers,
  services `front`/`frontend`, rollback sans migration et echec de disponibilite.
- Les workflows peuvent etre controles avec `actionlint` ; `Workflow Checks`
  automatise ce controle et les tests de scripts.

Le 31 octobre, les logs distants ont confirme que les sauvegardes utilisaient
Kubernetes sans kubeconfig (connexion refusee sur localhost:8080). Les workflows
de production utilisent desormais SSH et Docker Compose, comme le serveur actif.
Les secrets SSH ont ete configures avec une cle dediee aux Actions et la cle
publique du serveur est epinglee dans le depot.

Validation locale sur la version distante : 23 tests backend, 4 tests frontend
avec couverture et 20 tests E2E reussis. Le lint, TypeScript et les builds passent.
Le workflow de sauvegarde a aussi ete execute avec succes sur GitHub :
https://github.com/brahim1205/Kafountineproject/actions/runs/41191643421
L'artifact `database-backup` contient le dump telecharge depuis la production.
