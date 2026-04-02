SHELL := /bin/bash
SAFE_DIR := /tmp/kafontine-gm

.PHONY: help up down restart reset logs ps build check backend-check validate-prod-env prod-preflight prod-smoke up-prod down-prod logs-prod reset-prod up-dev down-dev logs-dev reset-dev bootstrap-dev-db dev-local backend-local backend-local-no-db front-local

help:
	@echo "Modes disponibles:"
	@echo "  make backend-local     -> démarre PostgreSQL/Redis de dev, prépare la base, puis lance le backend"
	@echo "  make backend-local-no-db -> lance seulement le backend (DB déjà prête)"
	@echo "  make front-local       -> lance le frontend Vite en local"
	@echo "  make up-dev            -> démarre PostgreSQL et Redis de développement"
	@echo "  make up-prod           -> démarre le stack production complet localement"
	@echo "  make validate-prod-env -> vérifie que .env.prod ne contient pas de placeholders"
	@echo "  make prod-preflight    -> lance les vérifications repo + build + tests avant prod"
	@echo "  make prod-smoke URL=https://domaine -> lance le smoke test HTTP post-déploiement"
	@echo "  make check            -> lance la vérification backend"

up:
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod up --build -d

down:
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod down

restart: down up

reset:
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod down -v --remove-orphans
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod up --build -d

logs:
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod logs -f --tail=200

ps:
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod ps

build:
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod build

check:
	cd backend && npm run build

backend-check:
	cd backend && npm run build

validate-prod-env:
	bash ./scripts/validate-prod-env.sh --allow-placeholders .env.prod

prod-preflight:
	bash ./scripts/prod-preflight.sh .env.prod

prod-smoke:
	test -n "$(URL)" || (echo "Usage: make prod-smoke URL=https://your-domain.com" && exit 1)
	bash ./scripts/smoke-prod.sh "$(URL)"

up-prod: validate-prod-env
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d

down-prod:
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod -f docker-compose.prod.yml down

logs-prod:
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f --tail=200

reset-prod: validate-prod-env
	ln -sfn "$$PWD" "$(SAFE_DIR)"
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod -f docker-compose.prod.yml down -v --remove-orphans
	cd "$(SAFE_DIR)" && docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d

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
