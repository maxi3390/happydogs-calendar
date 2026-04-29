#!/usr/bin/env bash
# run-e2e-tests.sh — run Playwright tests against an isolated, ephemeral
# Postgres + Django backend so the developer's working DB is never
# touched. See openspec/specs/tooling/e2e-isolation/spec.md.
#
# Flow:
#   1. Bring up `db-e2e` + `backend-e2e` from docker-compose.e2e.yml
#      under the `happy-calendar-e2e` compose project, on the dedicated
#      `happy-calendar-e2e` bridge network.
#   2. Wait for both healthchecks to report healthy.
#   3. Run Playwright in the pinned image, joined to the same network,
#      with NEXT_PUBLIC_API_URL pointing at `backend-e2e:8000`.
#   4. Tear the e2e stack down on exit (success or failure) via a bash
#      `trap`. Skipped when the operator sets `KEEP_E2E_DATA=1`, in
#      which case the stack stays up for inspection and `make e2e-down`
#      cleans it up later.
#
# The compose project / network are scoped to e2e — `compose down` on
# this file never touches the dev stack, even if both happen to be
# running at once.
#
# Pass-through args reach Playwright directly, e.g.:
#   bash scripts/run-e2e-tests.sh tests/auth.spec.ts
#   PLAYWRIGHT_ARGS=--trace=on bash scripts/run-e2e-tests.sh

set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)"
cd "$REPO_ROOT"

PLAYWRIGHT_IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.58.2-noble}"
COMPOSE_PROJECT="happy-calendar-e2e"
COMPOSE_FILE="docker-compose.e2e.yml"
NETWORK="happy-calendar-e2e"
PLAYWRIGHT_ARGS="${PLAYWRIGHT_ARGS:-}"

cleanup() {
  local exit_code=$?
  if [ "${KEEP_E2E_DATA:-}" = "1" ]; then
    echo
    echo "[e2e] KEEP_E2E_DATA=1: leaving the e2e stack up for inspection."
    echo "[e2e]   Inspect: docker compose -p $COMPOSE_PROJECT -f $COMPOSE_FILE exec backend-e2e python manage.py shell"
    echo "[e2e]   Clean up when done: make e2e-down"
    exit "$exit_code"
  fi
  echo
  echo "[e2e] Tearing down e2e stack..."
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
  exit "$exit_code"
}
trap cleanup EXIT

echo "[e2e] Bringing up db-e2e + backend-e2e + frontend-e2e..."
# `--build` forces docker to re-evaluate the build context on every run
# so frontend source changes (which invalidate the COPY . . layer in
# the Dockerfile) propagate into the next test run. Layer cache handles
# the no-changes case efficiently. `--wait` blocks until every started
# service is healthy; `--wait-timeout` is generous (240s) for cold
# `next build` runs.
if ! docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" up -d --build --wait --wait-timeout 240; then
  echo "[e2e] ERROR: e2e stack failed to come up healthy. Recent logs:" >&2
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" logs --tail=80 >&2 || true
  exit 1
fi

echo "[e2e] Running Playwright tests against frontend-e2e + backend-e2e..."
docker run --rm --network="$NETWORK" \
  -v "$REPO_ROOT/frontend:/app" \
  -w /app \
  -e BASE_URL=http://frontend-e2e:3000 \
  -e NEXT_PUBLIC_API_URL=http://backend-e2e:8000/api \
  "$PLAYWRIGHT_IMAGE" \
  sh -c "npm install && npx playwright test --project=chromium $PLAYWRIGHT_ARGS $*"
