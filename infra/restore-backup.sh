#!/usr/bin/env bash
# restore-backup.sh — Restore a .sql.gz backup into the local Docker database
# Usage: bash infra/restore-backup.sh <path-to-backup.sql.gz>
#
# Example:
#   bash infra/restore-backup.sh data/backup_20260323_000000.sql.gz

set -euo pipefail

BACKUP_FILE="${1:-}"
COMPOSE_FILE="docker/docker-compose.yml"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: bash infra/restore-backup.sh <path-to-backup.sql.gz>"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

# Load DATABASE_URL from docker/.env
if [[ -f "docker/.env" ]]; then
  DATABASE_URL=$(grep "^DATABASE_URL=" docker/.env | cut -d'=' -f2-)
else
  echo "Error: docker/.env not found"
  exit 1
fi

if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: DATABASE_URL not set in docker/.env"
  exit 1
fi

# Extract DB name from URL (last path segment)
DB_NAME="${DATABASE_URL##*/}"
# Build base URL pointing to default 'postgres' DB (for DROP/CREATE)
BASE_URL="${DATABASE_URL%/*}/postgres"

echo "Restoring backup : $BACKUP_FILE"
echo "Target database  : $DB_NAME"
echo ""
echo "WARNING: This will DROP and recreate the database '$DB_NAME'."
read -r -p "Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Step 1/3: Dropping database '$DB_NAME'..."
# Terminate all existing connections first, then drop
docker-compose -f "$COMPOSE_FILE" exec -T web \
  psql "$BASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
docker-compose -f "$COMPOSE_FILE" exec -T web \
  psql "$BASE_URL" -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"

echo "Step 2/3: Creating database '$DB_NAME'..."
docker-compose -f "$COMPOSE_FILE" exec -T web \
  psql "$BASE_URL" -c "CREATE DATABASE \"$DB_NAME\";"

echo "Step 3/3: Restoring data..."
gunzip -c "$BACKUP_FILE" | \
  docker-compose -f "$COMPOSE_FILE" exec -T web \
    psql "$DATABASE_URL"

echo ""
echo "Restore completed: $BACKUP_FILE"
