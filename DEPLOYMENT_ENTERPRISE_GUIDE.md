# Guide Deploiement Entreprise

## Objectif

Ce document decrit le flux de deploiement recommande pour Kafountine - Gestion Municipale avec Kubernetes en production.

Le principe du depot est maintenant le suivant:

- Docker Compose: developpement local uniquement
- Kubernetes: production
- Helm: packaging et mise a jour
- Traefik: ingress controller unique

## 1. Architecture cible

Architecture de production:

1. cluster Kubernetes
2. namespace dedie `kafontine`
3. frontend et backend en Deployments
4. PostgreSQL et Redis comme services internes
5. Traefik pour l'entree HTTP/HTTPS
6. Prometheus et Grafana pour l'observabilite

Repertoires de reference:

- manifestes bruts: [infra/k8s/README.md](./infra/k8s/README.md)
- chart Helm: [infra/helm/kafontine/Chart.yaml](./infra/helm/kafontine/Chart.yaml)
- runbook: [RUNBOOK_PRODUCTION.md](./RUNBOOK_PRODUCTION.md)
- checklist: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

## 2. Prerequis

Avant de deployer:

1. un cluster Kubernetes accessible
2. `kubectl` configure
3. `helm` installe
4. Traefik disponible sur le cluster
5. DNS pointe vers l'entree du cluster
6. les secrets de production sont connus

Verifications minimales:

```bash
kubectl get nodes
kubectl get ns
helm version
```

## 3. Variables et secrets

Le depot conserve les templates:

- `.env.prod.example`
- `.env.backend.prod.example`
- `.env.front.prod.example`

Ils servent de reference, mais en production les vraies valeurs doivent etre injectees dans:

1. des `Secrets` Kubernetes
2. ou un gestionnaire de secrets externe

Verifier le fichier:

```bash
bash ./scripts/validate-prod-env.sh .env.prod
```

Puis executer:

```bash
bash ./scripts/prod-preflight.sh .env.prod
```

## 4. Strategie de deploiement

Deux options sont supportees:

### Option A: manifestes Kubernetes

```bash
kubectl apply -f infra/k8s/
```

### Option B: Helm

Installation initiale:

```bash
helm install kafontine infra/helm/kafontine
```

Mise a jour:

```bash
helm upgrade --install kafontine infra/helm/kafontine
```

Le choix recommande pour la production est Helm, car il centralise les valeurs et facilite les upgrades.

## 5. Ordre de deploiement

Si tu deploies avec les manifestes:

1. namespace
2. configmap et secrets
3. postgres et redis
4. backend
5. frontend
6. observabilite
7. ingress

Si tu deploies avec Helm, l'ordre est gere par le chart.

## 6. Verification post-deploiement

Verifier les ressources:

```bash
kubectl get pods -n kafontine
kubectl get svc -n kafontine
kubectl get ingress -n kafontine
kubectl get hpa -n kafontine
```

Verifier le rollout:

```bash
kubectl rollout status deployment/backend -n kafontine
kubectl rollout status deployment/frontend -n kafontine
```

Verifier l'application:

```bash
bash ./scripts/smoke-prod.sh https://votre-domaine
```

## 7. Observabilite

Le projet inclut:

1. Prometheus
2. Grafana
3. endpoint `/metrics`

Acces local:

```bash
kubectl port-forward -n kafontine svc/prometheus 9090:9090
kubectl port-forward -n kafontine svc/grafana 3001:3000
```

Logs utiles:

```bash
kubectl logs -n kafontine deployment/backend --tail=200
kubectl logs -n kafontine deployment/frontend --tail=200
```

## 8. Rollback

Si un deploiement pose probleme:

```bash
kubectl rollout undo deployment/backend -n kafontine
kubectl rollout undo deployment/frontend -n kafontine
```

Avec Helm:

```bash
helm history kafontine
helm rollback kafontine <revision>
```

Toujours verifier ensuite:

```bash
kubectl get pods -n kafontine
bash ./scripts/smoke-prod.sh https://votre-domaine
```

## 9. Bonnes pratiques

1. ne pas utiliser Docker Compose pour la production
2. garder Traefik comme seul ingress controller pour ce projet
3. versionner les manifestes et les valeurs Helm
4. separer les secrets du code
5. verifier le cluster avant chaque mise en prod
6. executer un smoke test apres chaque deploiement
7. preparer un rollback avant tout changement

## 10. Commandes utiles

```bash
make validate-prod-env
make prod-preflight
make k8s-apply
make helm-upgrade
make prod-smoke URL=https://votre-domaine
```

## 11. Recommandation finale

Pour ce projet, la ligne propre est:

1. developpement local avec `docker-compose.dev.yml`
2. integration et packaging avec Docker
3. production avec Kubernetes
4. exploitation avec `kubectl`, Helm, Prometheus et Grafana

Si un document ou une commande fait encore reference a `docker-compose.prod.yml`, il faut le considerer obsolete.
