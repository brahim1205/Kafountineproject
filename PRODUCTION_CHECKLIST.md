# Checklist Production

## Obligatoire avant déploiement

- [ ] Rotater tous les secrets déjà exposés localement ou dans un ancien dépôt (`POSTGRES_PASSWORD`, `JWT_*`, `REDIS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`, `DATABASE_URL`)
- [ ] Remplacer tous les placeholders de [`.env.prod`](./.env.prod)
- [ ] Vérifier les secrets GitHub Actions: `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- [ ] Vérifier le domaine, DNS et les certificats HTTPS du serveur
- [ ] Configurer `PORTAL_OTP_DELIVERY_MODE=webhook`, `PORTAL_OTP_WEBHOOK_URL` en HTTPS et `PORTAL_OTP_WEBHOOK_TOKEN`
- [ ] Vérifier que `JWT_SECRET` et `JWT_REFRESH_SECRET` sont distincts et font au moins 32 caractères
- [ ] Configurer `TRUST_PROXY` avec des proxys explicites (`loopback,linklocal,uniquelocal` ou CIDR/IP), jamais `true` ni un simple nombre
- [ ] Garder `ENABLE_API_DOCS=false` en production
- [ ] Si `ENABLE_METRICS=true`, configurer `METRICS_BEARER_TOKEN` avec au moins 32 caractères et restreindre l’accès réseau à `/metrics`
- [ ] Exécuter `make validate-prod-env`
- [ ] Exécuter `make security-scan`
- [ ] Exécuter `bash ./scripts/prod-preflight.sh .env.prod`
- [ ] Vérifier le rendu Compose: `docker compose --env-file .env.prod -f docker-compose.prod.yml config`
- [ ] Vérifier que les migrations Prisma SQL sont versionnées et applicables: `cd database && npm run prisma:deploy`
- [ ] Vérifier qu’aucun fichier runtime n’est suivi par Git (`pg_data/`, `*.db`, `*.db-journal`, `*.backup`, `.env` réel)
- [ ] Vérifier l’accès SSH au serveur de production

## Obligatoire avant go-live

- [ ] Déployer avec [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
- [ ] Vérifier que les conteneurs sont sains : `ssh root@72.62.234.215 'cd /opt/kafontine && docker compose -f docker-compose.prod.yml ps'`
- [ ] Vérifier la disponibilité avec `bash ./scripts/smoke-prod.sh https://votre-domaine`
- [ ] Exécuter un backup réel via [`.github/workflows/backup.yml`](./.github/workflows/backup.yml)
- [ ] Tester une restauration via [`.github/workflows/disaster-recovery.yml`](./.github/workflows/disaster-recovery.yml)
- [ ] Tester un rollback via [`.github/workflows/rollback.yml`](./.github/workflows/rollback.yml)
- [ ] Vérifier les logs applicatifs

## Optionnel mais recommandé

- [ ] Ajouter plus de tests métier backend et frontend
- [ ] Documenter les responsabilités d’exploitation
- [ ] Faire un test de charge basique
- [ ] Journaliser un incident simulé et sa résolution
