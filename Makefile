SHELL := /bin/bash

.PHONY: help check backend-check security-scan validate-prod-env validate-prod-template prod-preflight prod-smoke k8s-apply helm-install helm-upgrade helm-uninstall up-dev down-dev logs-dev reset-dev bootstrap-dev-db dev-local backend-local backend-local-no-db front-local

help:
	@echo "Modes disponibles:"
	@echo "  make backend-local     -> démarre PostgreSQL/Redis de dev, prépare la base, puis lance le backend"
	@echo "  make backend-local-no-db -> lance seulement le backend (DB déjà prête)"
	@echo "  make front-local       -> lance le frontend Vite en local"
	@echo "  make up-dev            -> démarre PostgreSQL et Redis de développement"
	@echo "  make validate-prod-env -> vérifie que .env.prod ne contient pas de placeholders"
	@echo "  make security-scan     -> vérifie secrets/fichiers runtime suivis par Git"
	@echo "  make validate-prod-template -> vérifie seulement la structure du template .env.prod"
	@echo "  make prod-preflight    -> lance les vérifications repo + build + tests avant prod"
	@echo "  make prod-smoke URL=https://domaine -> lance le smoke test HTTP post-déploiement"
	@echo "  make k8s-apply         -> applique les manifestes Kubernetes"
	@echo "  make helm-install      -> installe le chart Helm kafontine"
	@echo "  make helm-upgrade      -> met à jour le chart Helm kafontine"
	@echo "  make helm-uninstall    -> supprime la release Helm kafontine"
	@echo "  make check            -> lance la vérification backend"

check:
	cd backend && npm run build

backend-check:
	cd backend && npm run build

security-scan:
	bash ./scripts/security-repo-scan.sh

validate-prod-env:
	bash ./scripts/validate-prod-env.sh .env.prod

validate-prod-template:
	bash ./scripts/validate-prod-env.sh --allow-placeholders .env.prod

prod-preflight:
	bash ./scripts/prod-preflight.sh .env.prod

prod-smoke:
	test -n "$(URL)" || (echo "Usage: make prod-smoke URL=https://your-domain.com" && exit 1)
	bash ./scripts/smoke-prod.sh "$(URL)"

k8s-apply: validate-prod-env
	kubectl apply -f infra/k8s/

helm-install: validate-prod-env
	helm install kafontine infra/helm/kafontine

helm-upgrade: validate-prod-env
	helm upgrade --install kafontine infra/helm/kafontine

helm-uninstall:
	helm uninstall kafontine

up-dev:
	docker compose -f docker-compose.dev.yml up -d postgres redis

down-dev:
	docker compose -f docker-compose.dev.yml down --remove-orphans

logs-dev:
	docker compose -f docker-compose.dev.yml logs -f --tail=200

reset-dev:
	docker compose -f docker-compose.dev.yml down -v --remove-orphans
	docker compose -f docker-compose.dev.yml up -d postgres redis

bootstrap-dev-db:
	cd backend && test -f .env || cp .env.example .env
	cd backend && npm run prisma:generate
	cd backend && npx prisma db push
	cd backend && npm run prisma:seed

dev-local: up-dev bootstrap-dev-db
	cd backend && npm run dev

backend-local: up-dev bootstrap-dev-db
	cd backend && npm run dev

backend-local-no-db:
	cd backend && test -f .env || cp .env.example .env
	cd backend && npm run dev

front-local:
	cd front && npm run dev
