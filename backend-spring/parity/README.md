# Banc de comparaison Node / Spring

Rejoue les mêmes requêtes sur le backend Node (port 3000) et le backend Spring (port 3002), chacun sur
une copie identique de la base, puis compare les réponses et le contenu des tables.

    mvn -Dmaven.test.skip=true package   # dans backend-spring/
    bash parity/setup.sh                 # Postgres 55432 et Redis 56379 locaux, base de départ
    bash parity/run-all.sh > run.log     # tous les scénarios

Les données locales vont dans `~/Bureau/kodify/.kaf-parity` (variable `KAF_PARITY_DATA`).
Le fichier `src/main/resources/openapi/openapi.json` est généré depuis `backend/src/config/swagger.ts`.
