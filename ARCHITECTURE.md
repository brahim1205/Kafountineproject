# Architecture Kafontine — Vision Globale

> **Principe directeur :** 1 outil = 1 responsabilité  
> **Dev :** Docker Compose | **Prod :** Kubernetes uniquement

---

## 🏗️ Architecture Simplifiée

```
┌─────────────────────────────────────────────────────────────┐
│                        Utilisateurs                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Ingress Controller (Traefik)                    │
│         SSL Let's Encrypt + Routage HTTP                     │
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

## 🟢 LOCAL (Développement)

| Outil | Usage | Fichier |
|---|---|---|
| **Docker Compose** | Orchestration locale complète | `docker-compose.dev.yml` |
| **PostgreSQL** | Base de données | Conteneur Docker |
| **Redis** | Cache + sessions | Conteneur Docker |
| **PgBouncer** | Pooling connexions | Conteneur Docker |
| **Prometheus + Grafana** | Observabilité | Conteneurs Docker |

```bash
# Démarrer l'environnement local
make backend-local   # Backend + DB + Redis
make front-local     # Frontend Vite
```

---

## 🟣 PRODUCTION (Kubernetes)

| Outil | Usage | Fichier |
|---|---|---|
| **Kubernetes** | Orchestration de conteneurs | `infra/k8s/*.yml` |
| **Helm** | Packaging des manifestes | `infra/helm/kafontine/` |
| **Traefik** | **Ingress Controller unique** | Annotations Ingress |
| **Cert-Manager** | SSL Let's Encrypt automatique | intégré via cluster/ingress |

> ⚠️ **Choix officiel : Traefik est le SEUL Ingress Controller.**  
> ❌ NGINX a été supprimé le 2024 (doublon, pas d'ambiguité).

```bash
# Déploiement production
kubectl apply -f infra/k8s/          # Manifestes bruts
# OU
helm install kafontine infra/helm/kafontine/  # Chart Helm
```

---

## 🔥 Ce qui a été supprimé (et pourquoi)

| Supprimé | Remplacé par | Justification |
|---|---|---|
| `docker-compose.prod.yml` | Kubernetes | Docker Compose n'est pas fait pour la prod |
| `scripts/horizontal-scale.sh` | Kubernetes HPA | Le scaling manuel n'a pas sa place en prod |
| `infra/nginx/kafontine-loadbalancer.conf` | Traefik Ingress | Un seul outil de réseau : **Traefik** |
| Références Docker Compose prod | Kubernetes / Helm | Flux de production unifié |

---

## 🛡️ Sécurité en Production

| Couche | Implémentation | Fichier |
|---|---|---|
| **Network Policies** | Isolation inter-services (deny-all par défaut) | `infra/k8s/12-network-policy.yml` |
| **RBAC** | Moindre privilège pour les pods | `infra/k8s/13-rbac.yml` |
| **Pod Disruption Budget** | Haute dispo pendant les rolling updates | `infra/k8s/14-pod-disruption-budget.yml` |
| **Security Context** | `runAsNonRoot`, `readOnlyRootFilesystem`, `drop ALL` | Dans chaque Deployment |
| **Secrets** | Kubernetes Secrets (pas de variables en dur) | injectés par le cluster / CI-CD |

### Security Context détaillé

```yaml
# Exemple backend
securityContext:
  runAsNonRoot: true
  fsGroup: 1000

# Exemple container applicatif
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  capabilities:
    drop:
      - ALL
```

> Les UID/GID exacts dependent de l'image. Le frontend Nginx utilise son propre UID non-root, il ne faut pas figer `1000` partout.

---

## 📊 Resource Requests / Limits

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| Backend | 250m | 1000m | 512Mi | 1Gi |
| Frontend | 100m | 500m | 128Mi | 256Mi |

> ✅ **Critique pour HPA** : sans requests/limits, l'auto-scaling ne fonctionne pas correctement.

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

---

## 📊 Observabilité

| Outil | Rôle | Endpoint |
|---|---|---|
| **Prometheus** | Collecte métriques | `http://prometheus:9090` |
| **Grafana** | Dashboards | `http://grafana:3000` |
| **Alertmanager** | Gestion alertes | `http://alertmanager:9093` |
| **OpenTelemetry** | Traces distribuées | Collector OTLP |
| **Métriques custom** | Uptime, mémoire, heap | `GET /metrics` |

---

## 🚀 Pipeline CI/CD

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Tests  │ → │  Scan   │ → │  Build  │ → │  Push   │ → │ Deploy  │
│Jest/Vitest│  │  Trivy  │   │ Docker  │   │ Registry│   │   K8s   │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

| Étape | Outil | Fichier |
|---|---|---|
| Tests | Jest, Vitest, Playwright | `.github/workflows/backend-ci.yml` |
| Scan sécurité | Trivy, npm audit | `.github/workflows/deploy.yml` |
| Build | Docker Buildx | `.github/workflows/deploy.yml` |
| Push | Docker Registry | `.github/workflows/deploy.yml` |
| Deploy | `kubectl apply` ou Helm | `.github/workflows/deploy.yml` |

---

## 🧠 Pitch pour l'Entretien

> *"J'ai conçu une architecture basée sur Docker pour le packaging et Kubernetes pour l'orchestration, avec CI/CD via GitHub Actions, observabilité complète (Prometheus, Grafana, OpenTelemetry) et auto-scaling via HPA. J'ai appliqué le principe '1 outil = 1 responsabilité' : Docker Compose pour le local, Kubernetes pour la production, **Traefik comme unique Ingress Controller**."*

---

## 📁 Structure des Fichiers Infra

```
infra/
├── k8s/                          # Manifestes Kubernetes (prod)
│   ├── 00-namespace.yml
│   ├── 01-configmap.yml
│   ├── 03-postgres.yml
│   ├── 04-redis.yml
│   ├── 06-backend.yml            # + securityContext + resources
│   ├── 07-frontend.yml           # + securityContext + resources
│   ├── 09-prometheus.yml
│   ├── 10-grafana.yml
│   ├── 12-network-policy.yml      # 🆕 Zero-trust
│   ├── 13-rbac.yml                # 🆕 Moindre privilège
│   ├── 14-pod-disruption-budget.yml # 🆕 Haute dispo
│   ├── deploy-k8s.sh
│   └── README.md
├── helm/                          # Chart Helm (prod packagée)
│   └── kafontine/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── README.md
│       └── templates/
├── terraform/                     # IaC (cloud provider)
│   ├── main.tf
│   └── variables.tf
└── k8s / helm / terraform         # production Kubernetes
```

---

## ✅ Checklist "Production Propre"

| Critère | Statut |
|---|---|
| 1 outil = 1 responsabilité | ✅ |
| Docker Compose = local uniquement | ✅ |
| Kubernetes = prod uniquement | ✅ |
| **Un seul Ingress Controller (Traefik)** | ✅ |
| Pas de scripts de scaling manuel | ✅ |
| Network Policies | ✅ |
| RBAC | ✅ |
| Pod Disruption Budget | ✅ |
| **Security Context (runAsNonRoot, readOnlyRootFilesystem)** | ✅ |
| **Resource Requests/Limits** | ✅ |
| Health checks (liveness/readiness) | ✅ |
| Graceful shutdown | ✅ |
| SSL automatique | ✅ |
| Observabilité complète | ✅ |
