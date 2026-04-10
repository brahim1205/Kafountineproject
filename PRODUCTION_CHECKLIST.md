# Checklist Production

## Obligatoire avant déploiement

- [ ] Rotater tous les secrets déjà exposés localement ou dans un ancien dépôt (`POSTGRES_PASSWORD`, `JWT_*`, `REDIS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`, `DATABASE_URL`)
- [ ] Remplacer tous les placeholders de [`.env.prod`](./.env.prod)
- [ ] Vérifier les secrets GitHub Actions: `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- [ ] Vérifier le domaine, DNS et les certificats HTTPS du reverse proxy réellement utilisé
- [ ] Si un `nginx` système occupe déjà `80/443`, déployer avec [`docker-compose.prod.yml`](./docker-compose.prod.yml) et ne pas utiliser [`docker-compose.yml`](./docker-compose.yml)
- [ ] Exécuter `make validate-prod-env`
- [ ] Exécuter `bash ./scripts/prod-preflight.sh`

## Obligatoire avant go-live

- [ ] Déployer avec [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
- [ ] Vérifier la disponibilité avec `bash ./scripts/smoke-prod.sh https://votre-domaine`
- [ ] Exécuter un backup réel via [`.github/workflows/backup.yml`](./.github/workflows/backup.yml)
- [ ] Tester une restauration via [`.github/workflows/disaster-recovery.yml`](./.github/workflows/disaster-recovery.yml)
- [ ] Tester un rollback via [`.github/workflows/rollback.yml`](./.github/workflows/rollback.yml)
- [ ] Vérifier Grafana, Prometheus, Alertmanager et les logs applicatifs

## Optionnel mais recommandé

- [ ] Ajouter plus de tests métier backend et frontend
- [ ] Documenter les responsabilités d’exploitation
- [ ] Faire un test de charge basique
- [ ] Journaliser un incident simulé et sa résolution
