# Checklist Production

## Obligatoire avant déploiement

- [ ] Rotater tous les secrets déjà exposés localement ou dans un ancien dépôt (`POSTGRES_PASSWORD`, `JWT_*`, `REDIS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`, `DATABASE_URL`)
- [ ] Remplacer tous les placeholders de [`.env.prod`](./.env.prod)
- [ ] Vérifier les secrets GitHub Actions: `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- [ ] Vérifier le domaine, DNS et les certificats HTTPS de l’ingress Kubernetes utilisé
- [ ] Configurer `PORTAL_OTP_DELIVERY_MODE=webhook`, `PORTAL_OTP_WEBHOOK_URL` en HTTPS et `PORTAL_OTP_WEBHOOK_TOKEN`
- [ ] Vérifier que `JWT_SECRET` et `JWT_REFRESH_SECRET` sont distincts et font au moins 32 caractères
- [ ] Configurer `TRUST_PROXY` avec des proxys explicites (`loopback,linklocal,uniquelocal` ou CIDR/IP), jamais `true` ni un simple nombre
- [ ] Garder `ENABLE_API_DOCS=false` en production
- [ ] Si `ENABLE_METRICS=true`, configurer `METRICS_BEARER_TOKEN` avec au moins 32 caractères et restreindre l’accès réseau à `/metrics`
- [ ] Exécuter `make validate-prod-env`
- [ ] Exécuter `make security-scan`
- [ ] Exécuter `bash ./scripts/prod-preflight.sh .env.prod`
- [ ] Vérifier le rendu Compose: `docker compose --env-file .env.prod -f docker-compose.prod.yml config`
- [ ] Vérifier le chart Helm si Kubernetes est utilisé: `helm lint infra/helm/kafontine`
- [ ] Vérifier que les migrations Prisma SQL sont versionnées et applicables: `cd backend && npm run prisma:deploy`
- [ ] Vérifier qu’aucun fichier runtime n’est suivi par Git (`pg_data/`, `*.db`, `*.db-journal`, `*.backup`, `.env` réel)
- [ ] Vérifier l’accès au cluster: `kubectl get nodes`

## Obligatoire avant go-live

- [ ] Déployer avec [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
- [ ] Vérifier `kubectl get pods -n kafontine`
- [ ] Vérifier `kubectl get ingress -n kafontine` ou `helm list -n kafontine`
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
