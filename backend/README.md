# Kafountine Gestion Municipale - Backend

API REST Node.js/Express pour la gestion municipale de Kafountine.

## Stack

- Node.js + TypeScript
- Express
- Prisma ORM
- PostgreSQL
- Redis
- JWT
- Swagger

## Architecture

Le backend suit maintenant une architecture monolitique modulaire.

```text
src/
  app.ts
  index.ts
  modules/
    auth/
    contribuables/
    transactions/
    dashboard/
    portal/
    placeholders/
  shared/
    config/
    container.ts
    errors/
    http/
    infrastructure/
    presentation/
    security/
    services/
    types/
```

Chaque module métier est organisé en 4 couches:
- `domain`: contrats métier et interfaces
- `application`: cas d'usage
- `infrastructure`: implémentations Prisma / adaptateurs techniques
- `presentation`: contrôleurs et routes Express

Les responsabilités transverses sont centralisées dans `shared/`:
- configuration
- erreurs applicatives
- réponses HTTP
- middleware d'authentification
- sécurité JWT
- healthchecks
- composition des dépendances

Cette structure permet de garder un monolithe simple à déployer tout en respectant les principes SOLID et la clean architecture:
- dépendances orientées vers les abstractions du `domain`
- cas d'usage isolés de Express et de Prisma
- contrôleurs minces
- wiring centralisé dans `shared/container.ts`

## Démarrage local

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

Pour un démarrage local complet depuis la racine du projet:

```bash
make backend-local
make front-local
```

Identifiants seed:
- `admin@kafountine.gouv.sn`
- `password123`

Contribuable seed portail:
- `NIN-TEST-0001`

Endpoints utiles:
- `GET /health`
- `GET /ready`
- `GET /api-docs`
- `GET /api/v1/dashboard/statistiques`

## Migration initiale

Une migration Prisma initiale est versionnée dans `prisma/migrations/` pour permettre l'usage de `prisma migrate deploy` en production.
