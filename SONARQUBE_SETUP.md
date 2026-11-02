# SonarQube Setup

Le dépôt est préparé pour un scan SonarQube via:

- [sonar-project.properties](./sonar-project.properties)
- [sonarqube.yml](./.github/workflows/sonarqube.yml)

## Prérequis GitHub

Ajouter dans `Settings > Secrets and variables > Actions`:

- `SONAR_HOST_URL`
- `SONAR_TOKEN`

## Déclenchement

Le workflow Sonar se lance:

- sur `push` vers `main`
- sur `pull_request`
- manuellement via `workflow_dispatch`

Le job ne s’exécute que si `SONAR_HOST_URL` et `SONAR_TOKEN` existent.

## Ce que fait le workflow

1. checkout complet du dépôt
2. installation des dépendances backend et frontend
3. build backend
4. lint frontend
5. build frontend
6. tests frontend avec couverture
7. scan SonarQube

## Périmètre Sonar actuel

Sources analysées:

- `backend/src`
- `front/src`

Tests déclarés:

- `backend/src/test`
- `front/src/test`
- `front/e2e`

Exclusions principales:

- `node_modules`
- `dist`
- `out`
- `coverage`
- `backend/prisma`
- migrations
- fichiers générés
- fichiers de config

## État du dépôt avant premier scan

- backend lint OK
- backend build OK
- backend tests OK
- frontend lint OK
- frontend build OK
- frontend tests OK

## Hotspots encore à surveiller

- SQL brut encore présent dans les repositories Prisma des modules métier (requêtes paramétrées)
- composants encore relativement longs côté frontend, selon la Quality Gate utilisée
- éventuelles rules de sécurité ou duplication propres à votre instance SonarQube

## Lecture du premier rapport

Après le premier scan, traiter d’abord:

1. `Bugs`
2. `Vulnerabilities`
3. `Security Hotspots`
4. `Code Smells` sur les fichiers les plus modifiés

Ne pas corriger tout le bruit d’un coup. Fermer d’abord les findings bloquants de la Quality Gate.
