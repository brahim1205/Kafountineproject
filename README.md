# Kafountine Gestion Municipale

Plateforme web de gestion municipale pour la commune de Kafountine.

Le projet regroupe un frontend React/Vite, un backend Java Spring Boot (`backend-spring/`), une base PostgreSQL, Redis, ainsi qu'une pile de déploiement Kubernetes avec Traefik. L'objectif est de centraliser les opérations municipales autour des contribuables, des taxes, des recettes et de plusieurs services métiers.

## Fonctionnalités principales

- Authentification et gestion des rôles
- Tableau de bord et statistiques
- Gestion des contribuables
- Gestion des taxes et des transactions
- Recettes et rapports
- État civil
- Urbanisme
- Formations
- Gestion du marché
- Quai de pêche
- Audit et paramètres

## Architecture

```text
.
├── front/                  # Application frontend React + Vite
├── backend-spring/         # API REST Java Spring Boot
├── database/               # Migrations Prisma, jeu de démonstration et tests d'API
├── infra/terraform/        # Infrastructure as code
├── traefik/                # Reverse proxy et configuration edge
├── scripts/                # Scripts de validation et de smoke tests
├── docker-compose.dev.yml  # Orchestration locale
└── docs racine             # Guides d'exploitation et de déploiement
```

### Frontend

- React 19
- Vite 7
- TypeScript
- Tailwind CSS
- React Router
- Vitest et Playwright

### Backend

- Java 17 + Spring Boot 3.3
- Prisma (migrations uniquement)
- PostgreSQL
- Redis
- JWT

Le backend est organisé par modules métier.

## Démarrage rapide

### Prérequis

- Java 17 et Maven
- Node.js 22 et npm
- Docker et Docker Compose

### 1. Cloner et préparer l'environnement

```bash
git clone <repo-url>
cd Kafontine-Gestion-municipale
```

### 2. Lancer le backend en local

```bash
make backend-local
```

Cette commande :
- démarre PostgreSQL et Redis en mode développement
- applique les migrations
- injecte les données de seed
- lance l'API backend

### 3. Lancer le frontend en local

Dans un second terminal :

```bash
make front-local
```

## Variables d'environnement

Des exemples sont fournis à la racine et dans chaque application :

- `.env.dev.example`
- `.env.prod.example`
- `.env.staging.example`
- [front/.env.example](./front/.env.example)
- [backend/.env.example](./backend/.env.example)

Copier les fichiers d'exemple vers `.env` ou `.env.prod` selon l'environnement ciblé, puis renseigner les valeurs réelles.

## Commandes utiles

```bash
make help                 # Affiche les cibles disponibles
make backend-local        # Lance le backend avec DB/Redis de dev
make backend-local-no-db  # Lance seulement le backend
make front-local          # Lance le frontend Vite
make up-dev               # Démarre PostgreSQL et Redis de dev
make down-dev             # Arrête l'environnement de dev
make prod-preflight       # Vérifications avant déploiement
make prod-smoke URL=https://example.com
make k8s-apply            # Applique les manifestes Kubernetes
make helm-upgrade         # Déploie ou met à jour la release Helm
```

## Tests

### Frontend

```bash
cd front
npm install
npm run test:run
npm run e2e
```

### Backend

```bash
cd backend-spring
mvn -Dmaven.test.skip=true package

# Tests d'API, backend démarré
cd ../database
npm ci
RUN_INTEGRATION_TESTS=true API_BASE_URL=http://127.0.0.1:3000 npm run test:api
```

## Endpoints utiles

- `GET /health`
- `GET /ready`
- `GET /api-docs`

## Identifiants de démonstration

Seed backend :

- `admin@kafountine.gouv.sn`
- mot de passe défini par `SEED_DEFAULT_PASSWORD` dans l'environnement local

## Déploiement et exploitation

La documentation d'exploitation est déjà disponible dans le dépôt :

- [DEPLOYMENT_ENTERPRISE_GUIDE.md](./DEPLOYMENT_ENTERPRISE_GUIDE.md)
- [RUNBOOK_PRODUCTION.md](./RUNBOOK_PRODUCTION.md)
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

## Références complémentaires

- [front/README.md](./front/README.md)
- [backend/README.md](./backend/README.md)
