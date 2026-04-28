# Tasks

## Setup
- [x] Create branch `feat/e2e-isolated-db`
- [x] Scaffold OpenSpec change folder

## Compose
- [x] Create separate `docker-compose.e2e.yml` (NOT added to docker-compose.yml) with `db-e2e` + `backend-e2e` services
- [x] Use a dedicated bridge network `happy-calendar-e2e` (pinned name) so dev and e2e stacks are network-isolated
- [x] tmpfs mount at `/var/lib/postgresql` (parent dir, matches postgres:18+'s major-version layout)
- [x] Healthchecks on both so `--wait` waits for "migrations done" before tests start

## Orchestrator
- [x] Write `scripts/run-e2e-tests.sh`: `set -uo pipefail`, `trap cleanup EXIT`, brings up the stack via `compose -p happy-calendar-e2e -f docker-compose.e2e.yml`, runs Playwright on `--network=happy-calendar-e2e`, tears down unless `KEEP_E2E_DATA=1`
- [x] Honour `PLAYWRIGHT_ARGS` so callers can pass through `--trace=on` etc.
- [x] Teardown via `compose down --remove-orphans` — safe because the dedicated compose project means it only sees e2e services

## Makefile
- [x] `test-frontend` → calls `bash scripts/run-e2e-tests.sh`
- [x] `test-frontend-debug` → calls the same with `PLAYWRIGHT_ARGS=--trace=on`
- [x] New target `e2e-up` (just bring up the stack, no teardown)
- [x] New target `e2e-down` (`compose down` against the e2e project only)
- [x] `make help` mentions `KEEP_E2E_DATA=1` and the new targets

## Docs / specs
- [x] Update `AGENTS.md` (services table + Makefile section)
- [x] Update `frontend/AGENTS.md` (verification commands + isolation invariants)
- [x] Create live spec `openspec/specs/tooling/e2e-isolation/spec.md`

## Verification
- [x] `make test-frontend` runs end-to-end (sample: `auth.spec.ts`, `language.spec.ts`, `password.spec.ts`)
- [x] After the run, the dev DB user count is unchanged (487 → 487; 0 new `e2e_*` users)
- [x] `KEEP_E2E_DATA=1 make test-frontend` leaves the stack up; `docker compose --profile e2e ps` shows `backend-e2e` and `db-e2e` still healthy
- [x] `make e2e-down` cleans up; `docker ps --filter name=e2e` returns empty
- [x] Backend test run unaffected: `make test-backend` still uses the in-memory SQLite (no e2e dependency added)

## Commit
- [x] Single commit, conventional message, on the feat branch
- [x] DO NOT merge or push without explicit operator consent
