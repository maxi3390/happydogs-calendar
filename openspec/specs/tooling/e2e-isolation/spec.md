# Tooling: E2E Test Isolation

## Purpose

Frontend Playwright (E2E) tests SHALL run against a database they own and discard. The development database (`happy-calendar_postgres_data`) is for the operator's working state; tests must never read from or write to it. This invariant is enforced at the infrastructure layer (a separate Postgres + backend container pair) so individual tests cannot accidentally re-route at the dev DB.

## Requirements

### Requirement: `make test-frontend` SHALL run against an isolated database

The repository SHALL provide a Makefile target `test-frontend` that runs Playwright tests against a Postgres instance distinct from the development database.

The target SHALL, in order:

1. Bring up three services defined in `docker-compose.e2e.yml` (a separate compose file from `docker-compose.yml`), under the dedicated `happy-calendar-e2e` compose project, on the dedicated `happy-calendar-e2e` bridge network:
   - `db-e2e` — Postgres with ephemeral (`tmpfs`) storage.
   - `backend-e2e` — the same Django image as `backend`, configured to talk to `db-e2e`.
   - `frontend-e2e` — the same source tree as `frontend`, **built with `NEXT_PUBLIC_API_URL=http://backend-e2e:8000/api` baked into the bundle** so the browser fetches resolve directly to the e2e backend.
2. Wait for all three services to be healthy (`backend-e2e` has migrations completed, `frontend-e2e` is responding to GET `/`).
3. Run Playwright in the existing pinned container image, joined to the `happy-calendar-e2e` network, with `BASE_URL=http://frontend-e2e:3000` and `NEXT_PUBLIC_API_URL=http://backend-e2e:8000/api` (the env var is consumed by server-side `page.request.*` helpers; the browser bundle already has the URL baked in).
4. Tear down the e2e stack on exit (success or failure), unless `KEEP_E2E_DATA=1` is set.

#### Scenario: A clean run leaves the dev DB untouched

- GIVEN the operator has a populated dev database with users, pets, and schedules
- WHEN they run `make test-frontend`
- THEN the test run SHALL bring up `db-e2e` and `backend-e2e`
- AND every server-side test request (registration, owner creation, schedule creation) SHALL hit `backend-e2e:8000`
- AND the dev `db` container SHALL receive zero writes from the test run
- AND when the run completes, `db-e2e` and `backend-e2e` SHALL be removed

#### Scenario: Browser-side fetches reach backend-e2e directly

- GIVEN the e2e stack is running
- WHEN the Playwright browser loads `http://frontend-e2e:3000` and the page makes a fetch to `/api/translations/en/`
- THEN that fetch SHALL resolve to `http://backend-e2e:8000/api/translations/en/` (the URL is baked into the bundle at build time via `NEXT_PUBLIC_API_URL`)
- AND the response SHALL come from the real e2e backend (not from a Playwright `page.route` mock)

#### Scenario: KEEP_E2E_DATA=1 leaves the stack up for inspection

- GIVEN a test run that the operator wants to inspect
- WHEN they run `KEEP_E2E_DATA=1 make test-frontend`
- THEN `db-e2e` and `backend-e2e` SHALL remain running after the test run completes
- AND the operator SHALL be able to `docker compose -p happy-calendar-e2e -f docker-compose.e2e.yml exec backend-e2e python manage.py shell` to inspect created records
- AND the tear-down hint SHALL inform them how to clean up (`make e2e-down`)

#### Scenario: Failure during the test run still tears down

- GIVEN a Playwright test fails or the test runner crashes
- WHEN the script exits non-zero
- THEN the cleanup trap SHALL still tear down `db-e2e` and `backend-e2e` (unless `KEEP_E2E_DATA=1`)
- AND the next `make test-frontend` SHALL start from a fresh empty database

### Requirement: The e2e database SHALL be ephemeral

The `db-e2e` service SHALL store its data on `tmpfs` (RAM-backed) rather than a named Docker volume. Stopping the container SHALL discard all data unconditionally.

This rules out a class of accidents where:

- A previous failed test run leaves rows behind that influence the next run.
- An operator forgets to run `down -v` and a subsequent run inherits state.
- A named volume collides with the dev `postgres_data` volume.

#### Scenario: Restarting db-e2e wipes its state

- GIVEN `backend-e2e` has registered some test users into `db-e2e`
- WHEN the operator runs `docker compose -p happy-calendar-e2e -f docker-compose.e2e.yml restart db-e2e`
- THEN `db-e2e` SHALL come back up with an empty database
- AND `backend-e2e`'s migrations SHALL run again (because the schema is gone too)

### Requirement: The e2e backend SHALL be reachable only on the e2e network

`backend-e2e` SHALL NOT register Traefik labels and SHALL NOT publish host ports. It SHALL be reachable only as `backend-e2e:8000` from within the dedicated `happy-calendar-e2e` Docker network — which is exactly where the Playwright container runs.

The e2e network SHALL be a separate bridge network from the dev stack's `happy-calendar_proxy` network, so the dev frontend / backend cannot reach the e2e services and vice versa.

This ensures that:

- The browser-side fetches in the dev frontend cannot accidentally hit the e2e backend (different network entirely).
- No process outside the e2e network can reach the e2e DB or backend.
- The e2e stack and the dev stack can run side-by-side without port conflicts.

#### Scenario: e2e backend not reachable from host

- GIVEN the e2e stack is running (`KEEP_E2E_DATA=1` left it up)
- WHEN the operator runs `curl http://localhost:8000/api/` from the host
- THEN the request SHALL reach the dev `backend` (via Traefik), NOT `backend-e2e`
- AND no port on the host SHALL forward to `backend-e2e`

#### Scenario: e2e and dev stacks are network-isolated

- GIVEN both the dev stack and the e2e stack are running
- WHEN the dev `backend` container tries to resolve `backend-e2e`
- THEN DNS resolution SHALL fail (different bridge network)
- AND when the e2e `backend-e2e` container tries to resolve `db` (the dev Postgres)
- THEN DNS resolution SHALL also fail

### Requirement: `make e2e-up` and `make e2e-down` SHALL drive the stack manually

The Makefile SHALL provide `e2e-up` and `e2e-down` targets so an operator can bring the e2e stack up without running tests (e.g. to seed it manually for a single ad-hoc Playwright invocation).

#### Scenario: Manual stack management

- WHEN the operator runs `make e2e-up`
- THEN `db-e2e` and `backend-e2e` SHALL come up
- AND `make e2e-down` SHALL tear them down
- AND `make e2e-down` SHALL be a no-op when the stack is already down

### Requirement: Backend unit tests SHALL remain isolated from the dev DB

`make test-backend` SHALL continue to use the existing `nursery.test_settings` (in-memory SQLite). The e2e isolation infrastructure SHALL NOT be a prerequisite for backend tests; running `make test-backend` SHALL NOT bring up `db-e2e`.

#### Scenario: Backend tests don't need the e2e stack

- GIVEN the e2e stack is down
- WHEN the operator runs `make test-backend`
- THEN the run SHALL succeed
- AND no e2e containers SHALL be brought up
