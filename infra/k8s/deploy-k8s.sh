#!/usr/bin/env bash
set -euo pipefail

# Script de déploiement Kubernetes pour Kafontine
# Usage: ./deploy-k8s.sh [environment]
# Exemple: ./deploy-k8s.sh production

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-production}"
NAMESPACE="kafontine"

echo "=========================================="
echo "  Kafontine Kubernetes Deployment"
echo "  Environment: ${ENVIRONMENT}"
echo "  Namespace: ${NAMESPACE}"
echo "=========================================="

# Vérifier les prérequis
command -v kubectl >/dev/null 2>&1 || { echo "kubectl est requis"; exit 1; }

# Vérifier la connexion au cluster
if ! kubectl cluster-info >/dev/null 2>&1; then
    echo "ERREUR: Impossible de se connecter au cluster Kubernetes"
    exit 1
fi

echo ""
echo "→ Vérification du namespace..."
kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1 || {
    echo "  Création du namespace ${NAMESPACE}..."
    kubectl apply -f "${SCRIPT_DIR}/00-namespace.yml"
}

echo ""
echo "→ Déploiement des ConfigMaps et Secrets..."
kubectl apply -f "${SCRIPT_DIR}/01-configmap.yml"
kubectl apply -f "${SCRIPT_DIR}/02-secret.yml"

echo ""
echo "→ Déploiement de la base de données..."
kubectl apply -f "${SCRIPT_DIR}/03-postgres.yml"

echo ""
echo "→ Déploiement de Redis..."
kubectl apply -f "${SCRIPT_DIR}/04-redis.yml"

echo ""
echo "→ Déploiement de PgBouncer..."
kubectl apply -f "${SCRIPT_DIR}/05-pgbouncer.yml"

echo ""
echo "→ Attente de la disponibilité de la base de données..."
kubectl wait --for=condition=ready pod -l app=postgres -n "${NAMESPACE}" --timeout=120s

echo ""
echo "→ Déploiement du backend..."
kubectl apply -f "${SCRIPT_DIR}/06-backend.yml"

echo ""
echo "→ Déploiement du frontend..."
kubectl apply -f "${SCRIPT_DIR}/07-frontend.yml"

echo ""
echo "→ Déploiement de l'ingress..."
kubectl apply -f "${SCRIPT_DIR}/08-ingress.yml"

echo ""
echo "→ Déploiement de l'observabilité..."
kubectl apply -f "${SCRIPT_DIR}/09-prometheus.yml"
kubectl apply -f "${SCRIPT_DIR}/10-grafana.yml"

echo ""
echo "=========================================="
echo "  Déploiement terminé !"
echo "=========================================="

echo ""
echo "→ Statut des pods :"
kubectl get pods -n "${NAMESPACE}"

echo ""
echo "→ Services :"
kubectl get svc -n "${NAMESPACE}"

echo ""
echo "→ Ingress :"
kubectl get ingress -n "${NAMESPACE}"

echo ""
echo "→ HPA :"
kubectl get hpa -n "${NAMESPACE}" 2>/dev/null || echo "  Aucun HPA trouvé"

echo ""
echo "Commandes utiles :"
echo "  kubectl logs -n ${NAMESPACE} deployment/backend --tail=100 -f"
echo "  kubectl port-forward -n ${NAMESPACE} svc/backend 3000:3000"
echo "  kubectl port-forward -n ${NAMESPACE} svc/grafana 3001:3000"
echo "  kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp'"
