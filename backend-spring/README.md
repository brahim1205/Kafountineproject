# Backend Spring Boot - Kafountine Gestion Municipale

Ce dossier contient une reproduction Spring Boot du backend Node/Express existant.

La correspondance des routes est résumée dans `ROUTE_PARITY.md`.

## Démarrage

Le projet utilise les mêmes services de développement que le backend Node:

```bash
cd ..
make spring-local
```

Par défaut:

- API Spring: `http://127.0.0.1:3001`
- PostgreSQL: `127.0.0.1:5434`
- Redis: `127.0.0.1:6380`
- Swagger UI: `http://127.0.0.1:3001/api-docs`

Le backend Node peut rester sur `3000`; Spring utilise `3001` pour éviter le conflit.

## Endpoints principaux

- `GET /health`
- `GET /ready`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `GET|POST /api/v1/contribuables`
- `PUT|DELETE /api/v1/contribuables/{id}`
- `GET /api/v1/transactions`
- `POST /api/v1/transactions`
- `GET /api/v1/transactions/categories`
- `GET /api/v1/transactions/categories/{id}/services`
- `GET /api/v1/transactions/statistiques`
- `GET /api/v1/dashboard/statistiques`
- `POST /api/v1/portal/auth/contribuable`
- `POST /api/v1/portal/auth/register`

Les réponses suivent le contrat Node: `{ "success": true, "data": ... }` ou `{ "success": true, "data": ..., "meta": ... }`.

## Build

Si Maven n'est pas installé localement, compilez avec Docker:

```bash
cd ..
make spring-build
```

Si Docker n'est pas disponible mais Maven est installé localement:

```bash
cd ..
make spring-build-local
```

`run-dev.sh` désactive la variable d'environnement `DEBUG` avant de lancer Spring. Certaines sessions Linux exportent `DEBUG`; Spring Boot l'interprète comme une demande de logs détaillés.

## Smoke test

Une fois le serveur lancé:

```bash
cd ..
make spring-smoke
```

Le script vérifie `/ready`, le login admin, une route protégée, le CRUD formations, le CRUD utilisateurs et un flux portail contribuable complet avec paiement/reçu temporaires.

## Frontend avec Spring

Pour pointer le frontend Vite vers le backend Spring:

```bash
cd ..
make front-spring-local
```

Un exemple d'environnement est disponible dans `front/.env.spring.example`.

## Docker Compose

Pour lancer PostgreSQL, Redis et le backend Spring ensemble:

```bash
cd ..
make spring-compose
```
