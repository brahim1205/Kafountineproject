# Correspondance Node / Spring

Ce document liste les familles de routes Node reproduites dans le backend Spring Boot.
La comparaison automatique se trouve dans `parity/` (voir son README).

## Socle

| Fonction | Node | Spring |
| --- | --- | --- |
| Santé | `GET /health` | `GET /health` |
| Readiness DB/Redis | `GET /ready` | `GET /ready` |
| Swagger | `GET /api-docs` | `GET /api-docs` |
| Métriques | `GET /metrics` | `GET /metrics` |

## Authentification

| Fonction | Route |
| --- | --- |
| Login agent | `POST /api/v1/auth/login` |
| Logout agent | `POST /api/v1/auth/logout` |
| Profil agent | `GET /api/v1/auth/me` |
| Refresh token | `POST /api/v1/auth/refresh` |
| Mot de passe oublié | `POST /api/v1/auth/forgot-password` |

## Modules principaux

| Module | Routes couvertes |
| --- | --- |
| Contribuables | `GET/POST /api/v1/contribuables`, `PUT/DELETE /api/v1/contribuables/{id}`, `GET /api/v1/contribuables/check-telephone` |
| Transactions | `GET/POST /api/v1/transactions`, catégories, services, statistiques, export |
| Dashboard | `GET /api/v1/dashboard/statistiques` |
| Portail contribuable | auth portail par NIN/téléphone, profil token/cookie, taxes, transactions, paiement initié/confirmé, reçu |
| Utilisateurs | `GET/POST/PUT/DELETE /api/v1/users`, statistiques |

## Modules métier génériques

Ces routes sont branchées sur les tables Prisma existantes lorsque la table est disponible.

| Domaine | Routes |
| --- | --- |
| Formations | `/formations`, `/formations/statistiques` |
| Jeunes | `/jeunes`, `/jeunes/{id}/formations/{formationId}` |
| État civil | `/etat-civil`, `/etat-civil/statistiques` |
| Urbanisme | `/urbanisme`, `/urbanisme/{id}`, `/urbanisme/statistiques` |
| Marché | `/marche/places`, `/marche/paiements`, `/marche/statistiques` |
| Motos | `/motos`, `/motos/paiements`, `/motos/statistiques`, `/motos/configuration`, changement conducteur |
| Quai de pêche | pêcheurs, embarcations, commissions, camions, expéditions, statistiques |
| Budget | `/budget/lignes`, `/budget/demandes`, `/budget/stats`, `/budget/statistiques` |
| Audit | `/audit`, `/audit/seed`, `/audit/export` |
| Notifications | `/notifications`, lecture simple, lecture globale |
| Paramètres | tarifs, pénalités, permissions, seed, backups |
| Années | `/years`, `/years/current`, `/years/auto-create` |
| Uploads / exports | image, receipt PDF, report PDF |

## Validation

Commandes utilisées pour valider:

```bash
make spring-build
make spring-compose
make spring-smoke
```

Le smoke test vérifie `/ready`, le login admin, une route protégée, le CRUD formations, le CRUD utilisateurs, puis un flux portail complet avec contribuable temporaire, taxe, paiement et reçu.
