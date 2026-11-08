#!/usr/bin/env bash
set -euo pipefail

# Backup pipeline: dump -> verify -> upload
# Usage: DATABASE_URL=postgresql://... bash backup-pipeline.sh

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
S3_BUCKET="${AWS_S3_BUCKET:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Kafontine Backup Pipeline ==="
echo "Started at: $(date)"

# Step 1: Run automated backup
echo "[pipeline] Step 1: Database dump"
bash "${SCRIPT_DIR}/backup-automated.sh"

# Step 2: Verify latest backup
echo "[pipeline] Step 2: Verify backup integrity"
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/kafontine_*.sql.gz 2>/dev/null | head -1)
if [ -z "${LATEST_BACKUP}" ]; then
  echo "[pipeline] ERROR: No backup file found"
  exit 1
fi

# Verify the backup can be listed (checks file integrity)
pg_restore --list "${LATEST_BACKUP}" > /dev/null 2>&1
echo "[pipeline] Backup verified: ${LATEST_BACKUP}"

# Step 3: Upload to S3 if configured
if [ -n "${S3_BUCKET}" ]; then
  echo "[pipeline] Step 3: Upload to S3"
  S3_PATH="s3://${S3_BUCKET}/$(date +%Y/%m/%d)/$(basename "${LATEST_BACKUP}")"
  aws s3 cp "${LATEST_BACKUP}" "${S3_PATH}"
  echo "[pipeline] Uploaded to ${S3_PATH}"
else
  echo "[pipeline] Step 3: S3 upload skipped (AWS_S3_BUCKET not set)"
fi

echo "[pipeline] Completed at: $(date)"
