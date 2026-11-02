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
    auth/             # connexion agents, sessions, refresh token
    contribuables/
    transactions/     # recettes et catalogue des taxes
    dashboard/
    portal/           # portail contribuable (OTP, paiements)
    budget/
    etat-civil/
    urbanisme/
    marche/
    motos/
    formations/       # formations et jeunes
    quai-peche/
    parametres/       # tarifs, pénalités, permissions, sauvegardes
    utilisateurs/
    notifications/    # notifications et années actives
    audit/
    rapports/         # reçus PDF, rapport annuel, journal consolidé
    medias/           # upload d'images
    municipal.routes.ts
  shared/
    audit/            # ports AuditTrail et ActorDirectory
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
- `application`: cas d'usage (classes `*UseCase` ou service applicatif par module)
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

Les services applicatifs ne reçoivent jamais la requête Express : le contrôleur en extrait
un `Actor` (utilisateur, rôle, IP) et les données validées par Zod, puis le service écrit
dans le journal d'audit via le port `AuditTrail`.

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
- mot de passe défini par `SEED_DEFAULT_PASSWORD` dans l'environnement local

Contribuable seed portail:
- `NIN-TEST-0001`

Endpoints utiles:
- `GET /health`
- `GET /ready`
- `GET /api-docs`
- `GET /api/v1/dashboard/statistiques`

## Migration initiale

Une migration Prisma initiale est versionnée dans `prisma/migrations/` pour permettre l'usage de `prisma migrate deploy` en production.
