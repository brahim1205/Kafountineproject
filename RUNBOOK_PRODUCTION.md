# Runbook Production

## 1. Préparation

1. Remplir [`.env.prod`](./.env.prod) avec des valeurs réelles.
2. Vérifier que les secrets GitHub Actions sont présents.
3. Lancer `bash ./scripts/prod-preflight.sh .env.prod`.
4. Vérifier l’accès au cluster Kubernetes: `kubectl get nodes`.

## 2. Déploiement

1. Déclencher [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).
2. Vérifier que le job `deploy` passe.
3. Vérifier les pods: `kubectl get pods -n kafontine`.
4. Vérifier l’ingress ou la release Helm selon le flux choisi.
3. Lancer `bash ./scripts/smoke-prod.sh https://votre-domaine`.

## 3. Vérifications post-déploiement

1. Vérifier `/health` et `/ready`.
2. Vérifier le login web.
3. Vérifier un parcours métier critique.
4. Vérifier Grafana et les logs backend: `kubectl logs -n kafontine deployment/backend --tail=200`.

## 4. Backup

1. Déclencher [`.github/workflows/backup.yml`](./.github/workflows/backup.yml).
2. Vérifier que l’artefact GitHub a bien été généré.
3. Vérifier la présence du dump sur le serveur.

## 5. Restauration

1. Déclencher [`.github/workflows/disaster-recovery.yml`](./.github/workflows/disaster-recovery.yml) avec `restore-latest` ou `restore-from-artifact`.
2. Vérifier `/ready` après restauration.
3. Refaire un smoke test HTTP.

## 6. Rollback

1. Identifier le tag image cible.
2. Déclencher [`.github/workflows/rollback.yml`](./.github/workflows/rollback.yml).
3. Vérifier `kubectl rollout status deployment/backend -n kafontine`.
4. Vérifier `/ready` puis relancer le smoke test.

## 7. Incident critique

1. Stopper les changements applicatifs.
2. Capturer l’état courant: logs, version, heure, impact.
3. Choisir entre rollback applicatif et restauration DB.
4. Vérifier le service après action.
5. Documenter l’incident.
