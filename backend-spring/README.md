# Backend Spring Boot - Kafountine Gestion municipale

Backend en production. Il expose la même API que `backend/` (Node/Express), sur la même base PostgreSQL et le même Redis.
Le schéma reste géré par les migrations Prisma de `backend/prisma` : au déploiement, l'image `migrator` les applique.

Stack : Java 17, Spring Boot 3.3, JDBC (`NamedParameterJdbcTemplate`), filtres et intercepteur reproduisant l'ordre des middlewares Express.
Configuration : mêmes variables d'environnement que Node (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `PORTAL_URL`, etc.).
Port par défaut : `3000` (`PORT`).

## Construire et lancer

```bash
mvn -Dmaven.test.skip=true package
java -jar target/gestion-municipale-spring-1.0.0.jar
```

L'image de production se construit avec `Dockerfile.prod`.

## Vérifier

- `parity/` : rejoue les mêmes requêtes sur Node et Spring et compare réponses et tables (voir `parity/README.md`). Ce contrôle tourne en CI.
- `smoke-test.sh` : parcours rapide sur un serveur de développement (`SMOKE_PASSWORD` requis, jamais en production).
- Les tests d'intégration de `backend/test` s’exécutent contre un serveur lancé grâce à `API_BASE_URL`.

## Faire évoluer l'API

Toute évolution d'une route, d'une validation ou d'une règle métier doit être faite dans `backend-spring`. Tant que `backend/` sert de référence,
reportez-la aussi côté Node et complétez un scénario de `parity/scenarios`, sinon la CI signalera l'écart.
