# Backend Spring Boot - Kafountine Gestion municipale

Backend en production. Il expose l'API de l'application, sur la base PostgreSQL et le même Redis.
Le schéma reste géré par les migrations Prisma de `database/prisma` : au déploiement, l'image `migrator` les applique.

Stack : Java 17, Spring Boot 3.3, JDBC (`NamedParameterJdbcTemplate`), filtres et intercepteur reproduisant l'ordre des middlewares Express.
Configuration : variables d'environnement (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, etc.).
Port par défaut : `3000` (`PORT`).

## Construire et lancer

```bash
mvn -Dmaven.test.skip=true package
java -jar target/gestion-municipale-spring-1.0.0.jar
```

L'image de production se construit avec `Dockerfile.prod`.

## Vérifier

- `smoke-test.sh` : parcours rapide sur un serveur de développement (`SMOKE_PASSWORD` requis, jamais en production).
- Les tests d'intégration de `database/test` s’exécutent contre un serveur lancé grâce à `API_BASE_URL`.

## Faire évoluer l'API

Toute évolution d'une route, d'une validation ou d'une règle métier doit être faite dans `backend-spring`. Tant que `backend/` sert de référence,
