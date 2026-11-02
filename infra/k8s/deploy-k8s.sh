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

apply_if_present() {
    local file="$1"
    local label="$2"
    if [[ -s "$file" ]]; then
        echo "→ ${label}..."
        kubectl apply -f "$file"
    else
        echo "→ ${label}: fichier absent ou vide, étape ignorée."
    fi
}

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
if [[ ! -f "${SCRIPT_DIR}/02-secret.yml" ]]; then
    echo "ERREUR: ${SCRIPT_DIR}/02-secret.yml est requis et ne doit pas être commité."
    echo "Copiez ${SCRIPT_DIR}/02-secret.example.yml vers 02-secret.yml et remplacez tous les placeholders."
    exit 1
fi
if grep -q "__SET_" "${SCRIPT_DIR}/02-secret.yml"; then
    echo "ERREUR: ${SCRIPT_DIR}/02-secret.yml contient encore des placeholders __SET_." >&2
    exit 1
fi
kubectl apply -f "${SCRIPT_DIR}/02-secret.yml"

echo ""
echo "→ Déploiement RBAC et NetworkPolicies..."
kubectl apply -f "${SCRIPT_DIR}/13-rbac.yml"
kubectl apply -f "${SCRIPT_DIR}/12-network-policy.yml"

echo ""
echo "→ Déploiement de la base de données..."
kubectl apply -f "${SCRIPT_DIR}/03-postgres.yml"

echo ""
echo "→ Déploiement de Redis..."
kubectl apply -f "${SCRIPT_DIR}/04-redis.yml"

echo ""
apply_if_present "${SCRIPT_DIR}/05-pgbouncer.yml" "Déploiement de PgBouncer"

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
apply_if_present "${SCRIPT_DIR}/08-ingress.yml" "Déploiement de l'ingress"

echo ""
echo "→ Déploiement de l'observabilité..."
kubectl apply -f "${SCRIPT_DIR}/09-prometheus.yml"
apply_if_present "${SCRIPT_DIR}/10-grafana.yml" "Déploiement de Grafana"

echo ""
echo "→ Déploiement des PodDisruptionBudgets..."
kubectl apply -f "${SCRIPT_DIR}/14-pod-disruption-budget.yml"

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
