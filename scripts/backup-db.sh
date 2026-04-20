#!/usr/bin/env bash
# backup-db.sh — write a full gzipped pg_dump of the PostgreSQL database
# backing the stack into backups/nursery-<YYYY-MM-DD-HHMMSS>.sql.gz.
#
# Starts the db container if it isn't running, waits for pg_isready, then
# pipes pg_dump through gzip. Sources .env if present so custom POSTGRES_*
# values override the compose defaults.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)"

BACKUPS_DIR="$REPO_ROOT/backups"
mkdir -p "$BACKUPS_DIR"

# Source .env if present so POSTGRES_* can be customized per deploy.
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

# Defaults mirror the values hardcoded in docker-compose.yml so the
# scripts work unchanged when .env doesn't customize them.
: "${POSTGRES_DB:=nursery}"
: "${POSTGRES_USER:=nursery}"

cd "$REPO_ROOT"

# Ensure the db container is running before trying to exec into it.
if ! docker compose ps --services --filter status=running 2>/dev/null | grep -q '^db$'; then
  echo "[backup] Starting db container..."
  docker compose up -d db >/dev/null
fi

echo "[backup] Waiting for db to become ready..."
for _ in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! docker compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
  echo "[backup] ERROR: db container did not become ready in 30s." >&2
  exit 1
fi

timestamp="$(date +'%Y-%m-%d-%H%M%S')"
filename="nursery-$timestamp.sql.gz"
filepath="$BACKUPS_DIR/$filename"

echo "[backup] Dumping database '$POSTGRES_DB' to $filepath..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner | gzip > "$filepath"

size="$(du -h "$filepath" | cut -f1)"
echo "[backup] Wrote $filepath ($size)"
