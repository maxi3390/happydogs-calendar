#!/usr/bin/env bash
# destroy-db.sh — irreversibly remove the external Docker volume that
# backs PostgreSQL for this stack. The Makefile passes POSTGRES_VOLUME_NAME
# so the script is the single source of truth for the confirmation flow,
# mirroring scripts/restore-db.sh.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)"

# Accept the volume name from the environment (set by the Makefile) and
# fall back to the repo's canonical value if invoked directly.
VOLUME="${POSTGRES_VOLUME_NAME:-happy-calendar_postgres_data}"

cd "$REPO_ROOT"

# Short-circuit if the volume doesn't even exist.
if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  echo "[destroy-db] Volume '$VOLUME' does not exist — nothing to do."
  exit 0
fi

echo
echo "[destroy-db] About to IRREVERSIBLY remove Docker volume: $VOLUME"
echo "[destroy-db] This deletes every owner, pet, schedule, user, vaccination,"
echo "[destroy-db] and setting in the current database. There is no undo."
echo "[destroy-db] To keep a copy of the data first, cancel and run 'make backup'."
echo

# Confirmation. Same pattern as scripts/restore-db.sh: probe /dev/tty
# with an actual open (test -r /dev/tty lies when stdin is redirected).
if { : < /dev/tty; } 2>/dev/null; then
  printf '[destroy-db] Type "yes" to continue: '
  read -r answer < /dev/tty
  if [[ "$answer" != "yes" ]]; then
    echo "[destroy-db] Aborted."
    exit 1
  fi
else
  if [[ "${RESTORE_I_UNDERSTAND:-}" != "yes" ]]; then
    echo "[destroy-db] ERROR: non-interactive destroy requires RESTORE_I_UNDERSTAND=yes." >&2
    echo "[destroy-db]        This operation removes the '$VOLUME' volume. Set the variable to proceed." >&2
    exit 1
  fi
  echo "[destroy-db] Non-interactive run (RESTORE_I_UNDERSTAND=yes); proceeding."
fi

# Stop and remove containers so the db container releases its lock on
# the volume. `docker compose down` does not touch external volumes.
echo "[destroy-db] Stopping and removing containers (external volume is untouched)..."
docker compose down >/dev/null 2>&1 || true

echo "[destroy-db] Removing volume '$VOLUME'..."
docker volume rm "$VOLUME" >/dev/null

echo "[destroy-db] Done. The next 'make up' will auto-provision an empty replacement."
