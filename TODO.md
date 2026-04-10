# État DevOps

Le socle DevOps est avancé, mais la qualification finale "production-ready" dépend encore de validations réelles d’exploitation.

## Fait

- CI backend et frontend présents
- Workflows de déploiement, backup, rollback et disaster recovery présents
- Validation de `.env.prod` ajoutée
- Stack prod Docker structurée
- Configuration SonarQube ajoutée
- Workflow GitHub SonarQube ajouté
- Hotspots principaux backend/frontend fortement réduits

## À valider en environnement réel

- Déploiement effectif sur serveur
- Backup réel et restauration réelle
- Rollback réel
- DNS, HTTPS, certificats et accès monitoring
- Exécution réelle du scan SonarQube avec `SONAR_HOST_URL` et `SONAR_TOKEN`
- Lecture du premier rapport Sonar et traitement des findings bloquants

## Références

- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- [RUNBOOK_PRODUCTION.md](./RUNBOOK_PRODUCTION.md)
- [SONARQUBE_SETUP.md](./SONARQUBE_SETUP.md)
