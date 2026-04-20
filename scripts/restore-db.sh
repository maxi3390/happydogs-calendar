#!/usr/bin/env bash
# restore-db.sh — restore the PostgreSQL database from a gzipped SQL
# backup produced by scripts/backup-db.sh.
#
# Accepts an explicit path via $1 or BACKUP_FILE=; defaults to the most
# recent backups/nursery-*.sql.gz. Requires explicit confirmation because
# the operation drops and recreates the live database. Use
# RESTORE_I_UNDERSTAND=yes for non-interactive contexts (CI, scripts).

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)"

if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

: "${POSTGRES_DB:=nursery}"
: "${POSTGRES_USER:=nursery}"

# Resolve the backup file: positional arg > BACKUP_FILE env > newest.
BACKUP_FILE="${1:-${BACKUP_FILE:-}}"

if [[ -z "$BACKUP_FILE" ]]; then
  # Newest backup by modification time. Use find + sort so the scripts
  # work even when the backups directory is symlinked somewhere weird.
  BACKUP_FILE="$(find "$REPO_ROOT/backups" -maxdepth 1 -type f -name 'nursery-*.sql.gz' -printf '%T@ %p\n' 2>/dev/null \
    | sort -n | tail -n 1 | cut -d' ' -f2- || true)"
  if [[ -z "$BACKUP_FILE" ]]; then
    echo "[restore] ERROR: no backups found under $REPO_ROOT/backups/nursery-*.sql.gz" >&2
    echo "[restore] Run 'make backup' first, or pass an explicit path: BACKUP_FILE=/path/to/file.sql.gz make restore" >&2
    exit 1
  fi
  echo "[restore] Using latest backup: $BACKUP_FILE"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[restore] ERROR: backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "[restore] ERROR: backup file is empty: $BACKUP_FILE" >&2
  exit 1
fi

# Destructive-operation confirmation. TTY interactive prompt OR explicit
# env var for non-interactive (CI, piped stdin).
#
# `test -r /dev/tty` is unreliable: it can succeed from the parent shell
# even when stdin is redirected and an actual open() would fail. Probe
# by attempting a real open and suppress its error.
if { : < /dev/tty; } 2>/dev/null; then
  printf '[restore] This will WIPE the current "%s" database and replace it with:\n' "$POSTGRES_DB"
  printf '           %s\n' "$BACKUP_FILE"
  printf '[restore] Type "yes" to continue: '
  read -r answer < /dev/tty
  if [[ "$answer" != "yes" ]]; then
    echo "[restore] Aborted."
    exit 1
  fi
else
  if [[ "${RESTORE_I_UNDERSTAND:-}" != "yes" ]]; then
    echo "[restore] ERROR: non-interactive restore requires RESTORE_I_UNDERSTAND=yes." >&2
    echo "[restore]        This operation drops the '$POSTGRES_DB' database. Set the variable to proceed." >&2
    exit 1
  fi
  echo "[restore] Non-interactive run (RESTORE_I_UNDERSTAND=yes); proceeding."
fi

cd "$REPO_ROOT"

if ! docker compose ps --services --filter status=running 2>/dev/null | grep -q '^db$'; then
  echo "[restore] Starting db container..."
  docker compose up -d db >/dev/null
fi

echo "[restore] Waiting for db to become ready..."
for _ in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! docker compose exec -T db pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; then
  echo "[restore] ERROR: db container did not become ready in 30s." >&2
  exit 1
fi

echo "[restore] Dropping database '$POSTGRES_DB' (FORCE terminates live connections)..."
docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\" WITH (FORCE);" >/dev/null

echo "[restore] Creating fresh database '$POSTGRES_DB' owned by '$POSTGRES_USER'..."
docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";" >/dev/null

echo "[restore] Loading $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 >/dev/null

echo "[restore] Done. Database '$POSTGRES_DB' restored from $BACKUP_FILE."
