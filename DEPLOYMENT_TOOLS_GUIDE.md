# Guide Detaille Des Outils De Deploiement

## Objectif

Ce document explique comment utiliser les outils de deploiement et d'exploitation du projet Kafountine - Gestion Municipale.

La regle du projet est simple:

- developpement local: Docker Compose + Node.js
- production: Kubernetes
- packaging de production: Helm
- exploitation: kubectl + scripts + GitHub Actions

## 1. Vue d'ensemble des outils

### `make`

`make` sert de point d'entree simple pour les commandes frequentes.

Cas d'usage:

1. lancer l'environnement local
2. verifier les variables de production
3. lancer les smoke tests
4. appliquer les manifestes Kubernetes
5. deployer avec Helm

Commande utile:

```bash
make help
```

### `docker compose`

`docker compose` est reserve au developpement local.

Fichier utilise:

- `docker-compose.dev.yml`

Cas d'usage:

1. demarrer PostgreSQL et Redis localement
2. tester le backend avec une vraie base locale

Il ne doit pas etre utilise pour la production.

### `kubectl`

`kubectl` est l'outil principal pour piloter Kubernetes.

Cas d'usage:

1. appliquer des manifestes
2. verifier les pods, services et ingress
3. consulter les logs
4. verifier les rollouts
5. executer des commandes dans les pods

### `helm`

`helm` sert a packager et deployer le projet sur Kubernetes.

Cas d'usage:

1. installation initiale
2. mise a jour du deploiement
3. rollback de chart
4. surcharge des images et du domaine

Le chart est ici:

- [infra/helm/kafontine/Chart.yaml](./infra/helm/kafontine/Chart.yaml)

Le namespace effectif est celui fourni a Helm avec `--namespace`. C'est ce namespace qui doit piloter le chart parent et les sous-charts Bitnami.

### Scripts shell

Le projet fournit plusieurs scripts:

- `scripts/validate-prod-env.sh`
- `scripts/prod-preflight.sh`
- `scripts/smoke-prod.sh`

Ils servent a:

1. verifier les variables d'environnement
2. detecter des incoherences avant mise en production
3. tester l'application apres deploiement

### GitHub Actions

Les workflows GitHub Actions automatisent:

1. CI backend et frontend
2. build d'images Docker
3. deploiement Kubernetes
4. rollback
5. backup
6. restauration

Les workflows critiques sont dans:

- [.github/workflows/deploy.yml](./.github/workflows/deploy.yml)
- [.github/workflows/rollback.yml](./.github/workflows/rollback.yml)
- [.github/workflows/backup.yml](./.github/workflows/backup.yml)
- [.github/workflows/disaster-recovery.yml](./.github/workflows/disaster-recovery.yml)

## 2. Installation locale des outils

### Outils minimum

Installer:

1. Node.js 20+
2. npm
3. Docker + Docker Compose plugin
4. kubectl
5. helm

Verification:

```bash
node -v
npm -v
docker --version
docker compose version
kubectl version --client
helm version
```

## 3. Utilisation en developpement local

### Demarrer la base locale

```bash
make up-dev
```

Cela demarre:

1. PostgreSQL
2. Redis

### Initialiser la base locale

```bash
make bootstrap-dev-db
```

Cette commande:

1. prepare `.env` dans `backend/`
2. genere Prisma
3. pousse le schema
4. lance le seed

### Lancer le backend

```bash
make backend-local
```

### Lancer le frontend

```bash
make front-local
```

### Arreter l'environnement local

```bash
make down-dev
```

## 4. Verification avant production

### Verifier les variables de production

```bash
make validate-prod-env
```

Cette commande echoue si `.env.prod` contient encore des placeholders.

### Verifier seulement la structure du template

```bash
make validate-prod-template
```

### Lancer le preflight complet

```bash
make prod-preflight
```

Le preflight doit etre lance avant chaque deploiement.

## 5. Deploiement Kubernetes brut

### Appliquer les manifestes

```bash
make k8s-apply
```

Equivalent:

```bash
kubectl apply -f infra/k8s/
```

### Verifier le namespace

```bash
kubectl get ns
kubectl get all -n kafontine
```

### Verifier les pods

```bash
kubectl get pods -n kafontine
kubectl get pods -n kafontine -w
```

### Verifier les services

```bash
kubectl get svc -n kafontine
```

### Verifier l'ingress

```bash
kubectl get ingress -n kafontine
```

## 6. Deploiement avec Helm

### Installation initiale

Avant le premier deploiement:

```bash
helm dependency build infra/helm/kafontine
```

```bash
make helm-install
```

Equivalent:

```bash
helm install kafontine infra/helm/kafontine --namespace kafontine --create-namespace
```

### Mise a jour

Si les dependances Helm changent:

```bash
helm dependency build infra/helm/kafontine
```

```bash
make helm-upgrade
```

Equivalent:

```bash
helm upgrade --install kafontine infra/helm/kafontine --namespace kafontine --create-namespace
```

### Suppression

```bash
make helm-uninstall
```

Equivalent:

```bash
helm uninstall kafontine
```

### Voir les releases

```bash
helm list -A
```

### Voir les valeurs

```bash
helm get values kafontine -n kafontine
```

### Voir l'historique

```bash
helm history kafontine -n kafontine
```

## 7. Mise a jour des images

Les workflows GitHub Actions injectent les images backend et frontend dans Helm avec:

1. `backend.image.repository`
2. `backend.image.tag`
3. `frontend.image.repository`
4. `frontend.image.tag`

Exemple manuel:

```bash
helm upgrade --install kafontine infra/helm/kafontine \
  --namespace kafontine \
  --create-namespace \
  --set backend.image.repository=docker.io/moncompte/kafontine-backend \
  --set backend.image.tag=abc123 \
  --set frontend.image.repository=docker.io/moncompte/kafontine-frontend \
  --set frontend.image.tag=abc123
```

## 8. Verification apres deploiement

### Rollout

```bash
kubectl rollout status deployment/kafontine-backend -n kafontine
kubectl rollout status deployment/kafontine-frontend -n kafontine
```

### Health checks

```bash
curl -f https://votre-domaine/health
curl -f https://votre-domaine/ready
```

### Smoke test projet

```bash
make prod-smoke URL=https://votre-domaine
```

## 9. Logs et debugging

### Logs backend

```bash
kubectl logs -n kafontine deployment/kafontine-backend --tail=200
```

### Logs frontend

```bash
kubectl logs -n kafontine deployment/kafontine-frontend --tail=200
```

### Logs en continu

```bash
kubectl logs -n kafontine deployment/kafontine-backend -f
```

### Entrer dans un pod

```bash
kubectl exec -it -n kafontine deployment/kafontine-backend -- sh
```

### Evenements du namespace

```bash
kubectl get events -n kafontine --sort-by='.lastTimestamp'
```

## 10. Sauvegardes

### Workflow GitHub Actions

Le workflow:

- [.github/workflows/backup.yml](./.github/workflows/backup.yml)

fait un `pg_dump` depuis le pod PostgreSQL via `kubectl exec`.

### Lancement manuel du workflow

Depuis GitHub:

1. ouvrir `Actions`
2. choisir `Database Backup`
3. cliquer `Run workflow`

### Secret important

Le workflow suppose:

- `KUBE_CONFIG_DATA`
- `K8S_NAMESPACE`
- `POSTGRES_SELECTOR` si tu veux surcharger le selecteur par defaut

Selecteur par defaut:

```text
app.kubernetes.io/instance=kafontine,app.kubernetes.io/name=postgresql
```

## 11. Restauration

### Workflow de restauration

Le workflow:

- [.github/workflows/disaster-recovery.yml](./.github/workflows/disaster-recovery.yml)

supporte:

1. `status`
2. `restore-latest`

### Fonctionnement

`restore-latest`:

1. telecharge le dernier artefact de backup
2. retrouve le pod PostgreSQL
3. injecte le dump avec `pg_restore`
4. verifie le rollout backend

## 12. Rollback

### Workflow GitHub Actions

Le workflow:

- [.github/workflows/rollback.yml](./.github/workflows/rollback.yml)

permet de redeployer une ancienne version d'image via Helm.

### Entrees du workflow

1. `environment`
2. `target_version`
3. `reason`

### Ce qu'il fait

1. configure `kubectl`
2. configure `helm`
3. reapplique le chart avec le tag image cible
4. attend la fin des rollouts
5. lance le health check

## 13. Secrets GitHub Actions a configurer

### Obligatoires pour la prod Kubernetes

- `KUBE_CONFIG_DATA`
- `HEALTH_URL`
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`

### Recommandes

- `DOCKER_REGISTRY`
- `DOCKER_IMAGE_NAME`
- `K8S_NAMESPACE`
- `HELM_RELEASE`
- `BACKEND_DEPLOYMENT`
- `FRONTEND_DEPLOYMENT`
- `POSTGRES_SELECTOR`
- `SLACK_WEBHOOK_URL`

### `KUBE_CONFIG_DATA`

Format attendu:

1. prendre le fichier kubeconfig
2. l'encoder en base64
3. le stocker comme secret GitHub

Exemple:

```bash
base64 -w 0 ~/.kube/config
```

### `global.existingSecret`

Le chart peut utiliser un Secret Kubernetes deja present au lieu d'en generer un.

Exemple:

```bash
kubectl create secret generic kafontine-prod-secrets \
  -n kafontine \
  --from-literal=DATABASE_URL='...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=JWT_REFRESH_SECRET='...' \
  --from-literal=REDIS_URL='...' \
  --from-literal=POSTGRES_PASSWORD='...' \
  --from-literal=REDIS_PASSWORD='...' \
  --from-literal=CORS_ORIGIN='https://votre-domaine' \
  --from-literal=PORTAL_URL='https://votre-domaine'
```

Puis:

```bash
helm upgrade --install kafontine infra/helm/kafontine \
  --namespace kafontine \
  --create-namespace \
  --set global.existingSecret=kafontine-prod-secrets
```

## 14. Fichiers a connaitre

### Infra

- [infra/k8s/README.md](./infra/k8s/README.md)
- [infra/helm/kafontine/values.yaml](./infra/helm/kafontine/values.yaml)

### Operations

- [RUNBOOK_PRODUCTION.md](./RUNBOOK_PRODUCTION.md)
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- [DEPLOYMENT_ENTERPRISE_GUIDE.md](./DEPLOYMENT_ENTERPRISE_GUIDE.md)

### Scripts

- [scripts/validate-prod-env.sh](./scripts/validate-prod-env.sh)
- [scripts/prod-preflight.sh](./scripts/prod-preflight.sh)
- [scripts/smoke-prod.sh](./scripts/smoke-prod.sh)

## 15. Routine recommandee

Avant de deployer:

1. `make validate-prod-env`
2. `make prod-preflight`
3. verifier les images Docker
4. verifier l'acces cluster

Pour deployer:

1. `helm dependency build infra/helm/kafontine`
2. `helm template kafontine infra/helm/kafontine --namespace kafontine > /tmp/kafontine-rendered.yaml`
3. verifier que PostgreSQL, Redis, backend, frontend, PgBouncer et monitoring sortent tous dans le namespace `kafontine`
4. pousser sur `main` ou lancer le workflow `Deploy Production`
5. verifier les rollouts
6. lancer le smoke test

Apres deploiement:

1. verifier `/ready`
2. verifier Grafana
3. verifier les logs backend

## 16. Commandes resumees

```bash
make help
make up-dev
make backend-local
make front-local
make validate-prod-env
make prod-preflight
make k8s-apply
make helm-upgrade
make prod-smoke URL=https://votre-domaine
kubectl get pods -n kafontine
kubectl rollout status deployment/kafontine-backend -n kafontine
helm list -A
```

## 17. Ce qu'il ne faut plus faire

Ne plus utiliser pour la production:

1. `docker-compose.prod.yml`
2. `docker compose up` pour exposer la prod
3. un deuxieme ingress controller en parallele de Traefik
4. des secrets stockes en clair dans le depot

La ligne propre du projet est maintenant:

- dev local: Compose
- prod: Kubernetes
