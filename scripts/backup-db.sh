#!/bin/bash
set -e

# PostgreSQL backup script for OdontoFlow
# Usage: bash scripts/backup-db.sh [output-dir]
#
# Requires DATABASE_URL environment variable to be set.
# Uses pg_dump under the hood.

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="odontoflow-backup-${TIMESTAMP}.sql"
FILEPATH="${OUTPUT_DIR}/${FILENAME}"

mkdir -p "$OUTPUT_DIR"

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set"
  echo "Usage: DATABASE_URL=postgres://... bash scripts/backup-db.sh"
  exit 1
fi

echo "Starting backup to ${FILEPATH}..."
pg_dump --no-owner --no-acl --clean --if-exists "$DATABASE_URL" > "$FILEPATH"
gzip "$FILEPATH"

echo "Backup complete: ${FILEPATH}.gz"
echo "Size: $(du -h "${FILEPATH}.gz" | cut -f1)"
