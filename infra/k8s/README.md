# Déploiement Kubernetes – Kafontine Gestion Municipale

Ce dossier contient l'ensemble des manifestes Kubernetes pour déployer Kafontine sur un cluster K8s.

---

## Architecture K8s

```
┌─────────────────────────────────────────────────────────────┐
│                        Ingress (SSL)                         │
│                         Traefik                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ Frontend│   │ Backend │   │ Grafana │
    │  (2 pods)│   │ (3 pods)│   │ (1 pod) │
    └────┬────┘   └────┬────┘   └─────────┘
         │             │
         │    ┌────────┴────────┐
         │    ▼                 ▼
         │ ┌─────────┐     ┌─────────┐
         │ │PgBouncer│     │  Redis  │
         │ │ (1 pod) │     │ (1 pod) │
         │ └────┬────┘     └─────────┘
         │      │
         │      ▼
         │ ┌─────────┐
         └►│PostgreSQL│
           │(Stateful)│
           └─────────┘
```

---

## Prérequis

- Cluster Kubernetes (v1.28+)
- kubectl configuré
- Ingress Controller Traefik
- Gestion TLS du cluster ou cert-manager selon l'infra cible
- Docker Registry accessible

---

## Fichiers Manifestes

| Fichier | Ressource | Description |
|---|---|---|
| `00-namespace.yml` | Namespace | Isolation du projet |
| `01-configmap.yml` | ConfigMap | Variables d'environnement non sensibles |
| `02-secret.example.yml` | Secret exemple | Modèle non sensible à copier en `02-secret.yml` hors Git |
| `03-postgres.yml` | StatefulSet + Service | Base de données PostgreSQL |
| `04-redis.yml` | StatefulSet + Service | Cache Redis protégé par mot de passe |
| `06-backend.yml` | Deployment + Service + HPA | API backend avec auto-scaling |
| `07-frontend.yml` | Deployment + Service | Application Angular |
| `09-prometheus.yml` | Deployment + Service | Métriques Prometheus |
| `10-grafana.yml` | Deployment + Service | Dashboards Grafana |
| `12-network-policy.yml` | NetworkPolicy | Isolation réseau |
| `13-rbac.yml` | RBAC | Service accounts sans token monté automatiquement |
| `14-pod-disruption-budget.yml` | PDB | Disponibilité pendant les maintenances |

---

## Déploiement Rapide

```bash
# 1. Vérifier les valeurs de prod et les secrets du cluster
bash ./scripts/validate-prod-env.sh .env.prod

# 2. Préparer les secrets hors Git
cp infra/k8s/02-secret.example.yml infra/k8s/02-secret.yml
# Remplacer tous les placeholders __SET_... dans infra/k8s/02-secret.yml

# 3. Appliquer les manifestes avec l'ordre contrôlé
bash infra/k8s/deploy-k8s.sh production

# 4. Vérifier le déploiement
kubectl get all -n kafontine

# 5. Vérifier les pods
kubectl get pods -n kafontine -w

# 5. Vérifier l'ingress
kubectl get ingress -n kafontine
```

---

## Commandes Utiles

```bash
# Voir les logs d'un pod
kubectl logs -n kafontine deployment/backend --tail=100 -f

# Scale manuellement le backend
kubectl scale deployment backend --replicas=5 -n kafontine

# Port-forward pour accéder localement
kubectl port-forward -n kafontine svc/backend 3000:3000
kubectl port-forward -n kafontine svc/grafana 3001:3000

# Exécuter une commande dans un pod
kubectl exec -it -n kafontine deployment/backend -- sh

# Voir les événements
kubectl get events -n kafontine --sort-by='.lastTimestamp'

# Rollback d'un déploiement
kubectl rollout undo deployment/backend -n kafontine
```

---

## Auto-Scaling (HPA)

Le backend est configuré avec un **HorizontalPodAutoscaler** :

| Métrique | Seuil | Action |
|---|---|---|
| CPU | 70% | Scale up/down |
| Mémoire | 80% | Scale up/down |
| Min replicas | 3 | Toujours disponible |
| Max replicas | 10 | Limite haute |

```bash
# Voir le statut du HPA
kubectl get hpa -n kafontine

# Décrite le HPA en détail
kubectl describe hpa backend-hpa -n kafontine
```

---

## Mise à Jour (Rolling Update)

```bash
# Mettre à jour l'image backend
kubectl set image deployment/backend backend=kafontine-backend:v1.1.0 -n kafontine

# Voir le rollout
kubectl rollout status deployment/backend -n kafontine

# Rollback si problème
kubectl rollout undo deployment/backend -n kafontine
```

---

## Monitoring

| Service | URL d'accès | Commande |
|---|---|---|
| Prometheus | http://localhost:9090 | `kubectl port-forward svc/prometheus 9090:9090 -n kafontine` |
| Grafana | http://localhost:3001 | `kubectl port-forward svc/grafana 3001:3000 -n kafontine` |
| Métriques app | `/metrics` | Désactivées par défaut; si activées, protéger avec `METRICS_BEARER_TOKEN` et limiter l'accès réseau |

---

## Sécurité

- **Network Policies** : manifestes présents dans ce dépôt
- **Pod Security Standards** : les conteneurs tournent sans privilèges
- **RBAC** : manifestes présents dans ce dépôt
- **Secrets** : créer `02-secret.yml` hors Git depuis `02-secret.example.yml` ou utiliser un gestionnaire externe

---

## Troubleshooting

| Problème | Solution |
|---|---|
| Pod en `Pending` | Vérifier les ressources (CPU/mémoire) et les PVC |
| Pod en `CrashLoopBackOff` | Vérifier les logs : `kubectl logs pod/xxx -n kafontine` |
| Ingress ne fonctionne pas | Vérifier l'ingress controller et le DNS |
| SSL non valide | Vérifier cert-manager et le ClusterIssuer |
| HPA ne scale pas | Vérifier metrics-server : `kubectl top nodes` |

---

## Migration depuis Docker Compose

| Étape | Action |
|---|---|
| 1 | Builder les images Docker et les pousser vers un registry |
| 2 | Modifier les images dans les manifestes K8s |
| 3 | Créer les secrets avec les vraies valeurs |
| 4 | Appliquer les manifestes dans l'ordre (00 → 11) |
| 5 | Vérifier la santé de tous les pods |
| 6 | Configurer le DNS vers l'IP de l'ingress |
| 7 | Tester l'application |
