# Kafountine Gestion Municipale

Plateforme web de gestion municipale pour la commune de Kafountine : encaissement des taxes, état civil, marché, motos-taxis, quai de pêche, urbanisme et budget.

Production : <https://orbyteconsulting.tech>

## Fonctionnalités

| Module | Contenu |
|---|---|
| Recettes et taxes | Tickets, catégories de taxes, reçus avec QR code |
| Pénalités | Consultation et suivi |
| État civil | Demandes, traitement, historique, statistiques |
| Urbanisme | Dossiers, validation, statistiques |
| Marché | Attribution des places, suivi des paiements |
| Motos-taxis | Enregistrement, cotisations, retards, amendes, changements de propriétaire |
| Quai de pêche | Pêcheurs, embarcations, commissions, camions frigorifiques |
| Budget | Lignes budgétaires, dépenses, suivi d'exécution |
| Administration | Utilisateurs, paramètres, sauvegardes, journal d'audit, rapports |

### Rôles

| Rôle | Périmètre |
|---|---|
| `super_admin` | Toute l'application, paramètres et audit |
| `admin` | Supervision et consultation des modules |
| `regisseur` | Lecture et écriture, sauf état civil et budget ; gère les comptes `agent`, `quai_peche` et `service_finances` |
| `agent` | Encaissements sur le terrain |
| `service_finances` | Budget et dépenses |
| `quai_peche` | Quai de pêche |
| `etat_civil` | État civil et ses taxes |

## Qui voit quoi

| Rôle | Accès |
|---|---|
| Super administrateur | Tous les modules, sauvegardes, journal d'audit, annulation des paiements |
| Administrateur | Consultation de tous les modules, sans écriture |
| Agent | Tickets, taxes, urbanisme, marché, cotisations et retards des motos, sa caisse |
| Régisseur | Comme l'agent, adhésion et changements des motos, quai de pêche et équipes, annulation des paiements, validation des caisses (hors état civil) |
| Service finances | Recettes, budget, validation des caisses, impayés |
| État civil | Ses demandes et tickets, sa caisse |
| Quai de pêche | Son module, consultation des motos, du marché et des impayés |

Un encaissement porte son mode de paiement et la personne qui l'a reçu. Une recette n'est jamais effacée : elle est annulée ou rejetée, et la trace reste au journal. Une année close ou une caisse clôturée ne se modifie plus.

Un acte d'état civil s'enregistre uniquement par une demande, jamais en ticket. Le loyer de chaque place occupée est créé automatiquement pour la période en cours (mois, trimestre, semestre ou année), et les places sont reconduites à chaque nouvelle année.

## Documentation

- [Manuel utilisateur](docs/MANUEL_UTILISATEUR.md) : utilisation de l'application, rôle par rôle.

## Architecture

```text
.
├── front-angular/          # Interface en production (Angular 22)
├── backend-spring/         # API REST Java Spring Boot
├── database/               # Migrations Prisma, données de démonstration, tests d'API
├── infra/                  # Timer systemd des sauvegardes, empreinte SSH du serveur
├── scripts/                # Exploitation, sauvegardes, déploiement
├── docker-compose.dev.yml  # PostgreSQL et Redis de développement
└── docker-compose.prod.yml # Pile de production
```

| Partie | Technologies |
|---|---|
| Interface | Angular 22 (composants autonomes, signaux, OnPush), TypeScript strict, Tailwind CSS, Vitest, Playwright |
| API | Java 17, Spring Boot 3.5, JWT en cookies |
| Données | PostgreSQL, Redis, migrations Prisma |
| Déploiement | Docker, Nginx, GitHub Actions |

Les pages de l'interface se trouvent dans `front-angular/src/app/pages/`, les services d'accès à l'API dans `src/app/services/`, et l'authentification et les intercepteurs dans `src/app/core/`.

## Démarrage local

### Prérequis

- Java 17 et Maven
- Node.js 22.22.3 ou plus récent, et npm
- Docker et Docker Compose

### Lancement

```bash
git clone <repo-url>
cd Kafontine-Gestion-municipale

# Terminal 1 : PostgreSQL, Redis, migrations, données de démonstration, API
make backend-local

# Terminal 2 : interface sur http://localhost:4200
make front-local
```

En développement, Angular transmet les appels `/api` à l'API sur le port 3000 (`front-angular/proxy.conf.json`).

### Comptes de démonstration

Les données de démonstration créent un compte par rôle, sur le modèle `admin@kafountine.gouv.sn`. Leur mot de passe est la valeur de `SEED_DEFAULT_PASSWORD` dans votre environnement local.

## Variables d'environnement

Copier l'exemple adapté, puis renseigner les valeurs réelles :

- `.env.dev.example`
- `.env.prod.example`
- [database/.env.example](./database/.env.example)

Ne jamais commiter de fichier `.env` contenant de vraies valeurs.

## Commandes utiles

```bash
make help                 # Liste les cibles disponibles
make backend-local        # API avec base et Redis de développement
make backend-local-no-db  # API seule
make front-local          # Interface Angular
make up-dev               # Démarre PostgreSQL et Redis
make down-dev             # Arrête l'environnement de développement
make prod-preflight       # Vérifications avant déploiement
make prod-smoke URL=https://example.com
```

## Tests

### Interface

```bash
cd front-angular
npm ci
npm run build
npm test -- --watch=false

# Tests de bout en bout : API et interface démarrées
npx playwright install chromium
SEED_DEFAULT_PASSWORD=<mot-de-passe-local> npm run e2e
```

### API

```bash
cd backend-spring
mvn -Dmaven.test.skip=true package

# API démarrée
cd ../database
npm ci
RUN_INTEGRATION_TESTS=true API_BASE_URL=http://127.0.0.1:3000 npm run test:api
```

## Points d'accès de contrôle

- `GET /health`
- `GET /ready`

## Déploiement

Le workflow [deploy.yml](./.github/workflows/deploy.yml) vérifie le code, construit trois images (`backend`, `migrator`, `frontend`), sauvegarde la base, puis déploie. L'étape de déploiement se lance manuellement avec l'option `deploy`, ou à la création d'un tag `v*`. L'image `frontend` est construite depuis `front-angular/`.

- [RUNBOOK_PRODUCTION.md](./RUNBOOK_PRODUCTION.md)
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- [GITHUB_ACTIONS_OPERATIONS.md](./GITHUB_ACTIONS_OPERATIONS.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)

## Versions précédentes

Le tag `memoire-node-react` conserve la version avec le backend Node.js et l'interface React. Le tag `derniere-version-react` conserve la dernière version de l'interface React.
