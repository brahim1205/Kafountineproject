# Architecture

## Production

Un seul serveur exécute la pile décrite par `docker-compose.prod.yml`.

```text
Navigateur → HTTPS → frontend (Nginx + Angular) → backend (Spring Boot) → PostgreSQL
                                                                       → Redis
```

| Service | Rôle | Source |
|---|---|---|
| `frontend` | Sert l'interface et relaie `/api` vers le backend | `front-angular/` |
| `backend` | API REST, authentification par JWT en cookies | `backend-spring/` |
| `migrator` | Applique les migrations avant le démarrage du backend | `database/` |
| `postgres` | Données | image PostgreSQL |
| `redis` | Sessions et limites de débit | image Redis |

## Développement local

`docker-compose.dev.yml` démarre PostgreSQL et Redis.

```bash
make backend-local   # base, migrations, données de démonstration, API
make front-local     # interface Angular
```

## Intégration et déploiement

| Workflow | Rôle |
|---|---|
| `spring-ci.yml` | Tests d'API, construction des images backend et migrations |
| `front-angular-ci.yml` | Lint, build, tests, audit des dépendances, image |
| `e2e.yml` | Parcours Playwright sur l'interface et l'API réelles |
| `deploy.yml` | Vérifie, construit, sauvegarde la base, puis déploie |
| `rollback.yml` | Revient à une version précédente |
| `backup.yml`, `disaster-recovery.yml` | Sauvegardes et exercice de restauration |

Les procédures d'exploitation sont dans [RUNBOOK_PRODUCTION.md](./RUNBOOK_PRODUCTION.md).
