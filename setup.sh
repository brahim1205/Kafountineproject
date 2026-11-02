#!/bin/bash

# Script de configuration et de démarrage - Kafontine Gestion Municipale

set -e

echo "========================================"
echo "  KAFONTINE - Configuration Initiale"
echo "========================================"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé. Veuillez installer Docker."
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose n'est pas installé."
    exit 1
fi

# Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    log_info "Création du fichier .env..."
    cp .env.dev.example .env
    log_info "Fichier .env créé. Veuillez le modifier si nécessaire."
fi

if ! grep -q '^SEED_DEFAULT_PASSWORD=' .env; then
    seed_password="$(openssl rand -base64 24 | tr -d '\n')"
    printf '\nSEED_DEFAULT_PASSWORD=%s\n' "$seed_password" >> .env
    log_info "Mot de passe seed local généré dans .env."
fi

set -a
source .env
set +a

# Démarrer les services de base (PostgreSQL, Redis)
log_info "Démarrage des services Docker (PostgreSQL, Redis)..."
docker compose -f docker-compose.dev.yml up -d

# Attendre que PostgreSQL soit prêt
log_info "Attente de PostgreSQL..."
for i in {1..30}; do
    if docker exec kafontine-postgres-dev pg_isready -U postgres -d vhm-finances &> /dev/null; then
        log_info "PostgreSQL est prêt!"
        break
    fi
    sleep 2
done

# Configuration du backend
log_info "Configuration du backend..."
cd backend

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    log_info "Installation des dépendances backend..."
    npm ci
fi

# Générer le client Prisma
log_info "Génération du client Prisma..."
npx prisma generate

# Appliquer les migrations
log_info "Application des migrations..."
npx prisma migrate deploy || npx prisma migrate dev --name init

# Exécuter le seed
log_info "Seed de la base de données..."
npx prisma db seed

cd ..

# Configuration du frontend
log_info "Configuration du frontend..."
cd front

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    log_info "Installation des dépendances frontend..."
    npm ci
fi

cd ..

log_info ""
log_info "========================================"
log_info "  Configuration terminée!"
log_info "========================================"
log_info ""
log_info "Pour démarrer l'application:"
log_info "  Backend:  cd backend && npm run dev"
log_info "  Frontend: cd front && npm run dev"
log_info ""
log_info "Ou avec Docker:"
log_info "  docker compose -f docker-compose.dev.yml up -d"
log_info ""
log_info "Comptes de démonstration créés avec le mot de passe SEED_DEFAULT_PASSWORD défini dans .env."
log_info "  Admin: admin@kafountine.gouv.sn"
log_info "  Agent: agent@kafountine.gouv.sn"
log_info "  Comptable: comptable@kafountine.gouv.sn"
log_info ""
