# Kafountine - Gestion Municipale

## Pitch de Soutenance E221

---

## Introduction

Kafountine est une commune rurale du Sénégal situated dans la région de Ziguinchor, au sud du pays. Comme beaucoup de collectivités locales africaines, elle fait face à des défis majeurs de modernisation administrative : fragmentation des services, gestion papier obsolète, absence de traçabilité et perte de revenus fiscaux.

Face à ce constat, nous avons conçu **Kafountine - Gestion Municipale**, une plateforme web complète qui digitalise l'ensemble des services communaux sur une architecture moderne et robuste.

---

## 1. Contexte et Problématique

Les communes sénégalaises font face à une fragmentation numérique grave :
- **10+ services** (taxes, État civil, urbanisme, marché, pêche, etc.) opérant en **silos isolés**
- Gestion **papier** pour les contribuables et recettes
- Absence de traçabilité et de centralisation des données
- Délai de traitement long, erreurs manuelles, perte de revenus

**Solution :** Une plateforme unifiée qui digitalise TOUS les services municipaux avec une base de données centralisée.

---

## 2. Modules Fonctionnels

| Module | Description |
|--------|-------------|
| **Authentification** | JWT avec rôles (Admin, Agent, Contribuable) |
| **Contribuables** | Fichier centralisé avec historique fiscal |
| **Taxes & Transactions** | Encaissement, reçus, suivi des paiements |
| **Recettes** | Tableau de bord financier, rapports |
| **État civil** | Demandes de documents (actes, copies) |
| **Urbanisme** | Permis de Construction, Validation de dossiers |
| **Marché municipal** | Attribution places, suivi paiements |
| **Motos & Taxis** | Immatriculation, renouvellement, pénalités |
| **Quai de pêche** | Enregistrement pêcheurs, boats, expéditions |
| **Formations** | Programmes jeunesse & inscriptions |
| **Budget** | Lignes budgétaires, demandes, approbations |
| **Portail contribuable** | Auto-service : consultation, paiement en ligne |
| **Audit & Logs** | Traçabilité complète des actions |

---

## 3. Architecture Technique

```
┌─────────────────────────────────────────┐
│           FRONTEND (React 19)           │
│  Vite 7 • Tailwind • React Router       │
│  Recharts (dashboards) • i18n           │
└──────────────────┬──────────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────────┐
│          BACKEND (Node.js/Express)      │
│  TypeScript • Prisma ORM • Zod         │
│  JWT Auth • Swagger • Redis Caching     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼────────────────────┐
│            BASE DE DONNÉES              │
│  PostgreSQL (18 tables) • Redis         │
└─────────────────────────────────────────┘
```

### Stack détaillée

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 19, Vite 7, TypeScript, Tailwind CSS, React Router, Recharts |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Zod (validation) |
| **Base de données** | PostgreSQL (18 modèles Prisma) |
| **Cache** | Redis |
| **Auth** | JWT + bcryptjs |
| **API Docs** | Swagger |
| **Tests** | Vitest + Playwright (front), Jest (back) |
| **Déploiement** | Docker, Traefik, GitHub Actions CI/CD |

---

## 4. Innovations Techniques

1. **Architecture modulaire Clean Architecture** (domain/application/infrastructure/presentation)
2. **Validation Zod** côté serveur avec sanitisation
3. **Audit trail complet** sur toutes les opérations
4. **Permissions par rôle** configurable
5. **API REST documentée** avec Swagger
6. **CI/CD complet** : tests, lint, build, déploiement
7. **Infrastructure as Code** (Terraform)
8. **Backup automatisé** avec GitHub Actions
9. **Portail auto-service** pour contribuables

---

## 5. Chiffres Clés

- **18 entités** dans le schéma de base de données
- **12+ modules** fonctionnels
- **~50 endpoints** API REST
- **Multi-environnement** : dev, staging, production
- **Sécurité** : JWT, Helmet, validation Zod, audit logs

---

## 6. Pitch Oral

> *"Nous avons développé une plateforme web de gestion municipale complète pour la commune de Kafountine au Sénégal. Cette solution digitalise l'ensemble des services communaux - taxes, État civil, urbanisme, marché, pêche, formations - sur une architecture moderne React/Node.js avec une base de données centralisée PostgreSQL. Le système inclut un portail contribuable pour le paiement en ligne et un module d'audit traçabilité. Cette plateforme répond aux besoins de modernisation administrative et de réduction de la fracture numérique dans les collectivités locales sénégalaises."*

---

## 7. Références Techniques

- Schéma Prisma : `backend/prisma/schema.prisma` (18 modèles)
- Routes API : `backend/src/presentation/routes/index.ts`
- Frontend pages : `front/src/pages/*/page.tsx`
- Config Docker : `docker-compose.yml`
- CI/CD GitHub : `.github/workflows/`

---

## 8. Identifiants de Démo

- Admin : `admin@kafountine.gouv.sn` / `password123`
- Contribuable portail : `NIN-TEST-0001`

---

## 9. Commandes de Démarrage

```bash
# Backend
make backend-local

# Frontend
make front-local

# Docker complet
docker-compose up
```

---

## Conclusion

Ce projet démontre qu'il est possible de transformer la gestion administrative des collectivités locales africaines grâce à la technologie. Kafountine - Gestion Municipale n'est pas seulement une aplicação web : c'est un modèle de modernisation qui peut être adapté à d'autres communes du Sénégal et de la sous-région.

Les résultats attendus sont significatifs :
- **Réduction** de la fraude fiscale grâce à la traçabilité
- **Amélioration** de la collecte des recettes
- **Gain de temps** pour les agents municipaux
- **Transparence** vis-à-vis des contribuables
- **Accessibilité** via le portail en ligne

Ce travail constitue une brique solide pour la transformation numérique du service public local.

---

## Remerciements

Nous tenons à exprimer notre gratitude à :

- **Monsieur l'Encadreur** pour son accompagnement et ses conseils avisés tout au long de ce projet
- **L'équipe pédagogique** de l'Ecole 221 pour la formation de qualité dispensée
- **Les autorités communales de Kafountine** pour les informations fournies sur les besoins métier
- **La communauté open source** pour les bibliothèques et outils utilisés dans ce projet

Merci pour votre attention.