#!/usr/bin/env bash
set -euo pipefail

# Automated PostgreSQL backup script for Kafontine
# Usage: DATABASE_URL=postgresql://... BACKUP_DIR=./backups bash backup-automated.sh

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/kafontine_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Starting backup at $(date)"
echo "[backup] Target: ${BACKUP_FILE}"

# Extract connection info from DATABASE_URL
PGPASSWORD=$(echo "${DATABASE_URL}" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
PGHOST=$(echo "${DATABASE_URL}" | sed -n 's/.*@\([^:]*\):.*/\1/p')
PGPORT=$(echo "${DATABASE_URL}" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
PGDATABASE=$(echo "${DATABASE_URL}" | sed -n 's/.*\/\([^?]*\).*/\1/p')
PGUSER=$(echo "${DATABASE_URL}" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

export PGPASSWORD PGHOST PGPORT PGDATABASE PGUSER

# Run pg_dump
pg_dump \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_FILE}" \
  2>&1 | grep -v "^$"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[backup] Completed: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Cleanup old backups
echo "[backup] Cleaning up backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name "kafontine_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete -print

echo "[backup] Done at $(date)"
