# Isolate E2E (Playwright) tests in their own ephemeral database

## Why

`make test-frontend` runs Playwright against the live development stack. The test helper `setupAuth` calls `POST /api/auth/register/` for every test, which writes a real `e2e_<timestamp>_<random>@example.com` user into the dev Postgres DB. Two follow-on problems result:

1. **Pollution.** A single full run leaves dozens of `e2e_*` users behind. After a few weeks of work the dev DB had 482 of them — most of the user table is test detritus. The admin user list slows down, schedule pages render extra noise, and snapshots/backups carry it forever.
2. **Cross-contamination risk.** Tests can in principle observe data created by the developer (real users, schedules, settings) and vice-versa. A test that asserts "the user list has 1 admin" passes locally, fails on a polluted CI box, and the failure mode is non-obvious.

The fix the team wants is the standard one: e2e tests run against a database they own and throw away.

## What

A new isolated Postgres + backend stack dedicated to e2e tests, brought up before the test run and torn down after — kept fully separate from `docker-compose.yml`.

1. **`docker-compose.e2e.yml`** is a brand-new file (NOT an addition to `docker-compose.yml`) containing only the two e2e services and their network:
   - `db-e2e` — `postgres:18-alpine`, `tmpfs` data dir (zero persistent storage), same db/user/password (`nursery`/`nursery`/`nursery`) as the dev DB so the backend image needs no env-var changes beyond `POSTGRES_HOST`.
   - `backend-e2e` — same image as `backend`, talks to `db-e2e` instead of `db`, runs `migrate` then `runserver` on container start. Reachable as `backend-e2e:8000`.
   - Network `happy-calendar-e2e` (pinned name, no project prefix). Separate bridge network from the dev stack's `happy-calendar_proxy`.
2. **`scripts/run-e2e-tests.sh`** orchestrates the run:
   - Brings up the stack with `docker compose -p happy-calendar-e2e -f docker-compose.e2e.yml up -d --wait`. The dedicated compose project means `compose down` against this file CANNOT affect the dev stack.
   - Runs Playwright in the existing `mcr.microsoft.com/playwright` container, joined to `--network=happy-calendar-e2e`, with `NEXT_PUBLIC_API_URL=http://backend-e2e:8000/api`.
   - Tears the e2e stack down on exit (success or failure) via a bash `trap`, removing the containers AND the tmpfs DB AND the e2e network.
   - Skips teardown when the operator sets `KEEP_E2E_DATA=1`, leaving the e2e backend reachable for inspection.
3. **`Makefile`** rewires `test-frontend` and `test-frontend-debug` to call the script. New targets `e2e-up` / `e2e-down` let an operator drive the stack manually for ad-hoc debugging.
4. **`AGENTS.md`** + **`frontend/AGENTS.md`** document the new flow and the `KEEP_E2E_DATA=1` debug switch.
5. **Live spec** at `openspec/specs/tooling/e2e-isolation/spec.md` codifies the invariants so future agents don't accidentally re-route tests at the dev DB.

## Impact

- **Dev DB stops accumulating `e2e_*` users.** A separate cleanup step (out of scope here) can wipe the existing 482; from this change forward, no new ones are created against the dev DB.
- **Test runs are reproducible.** Each `make test-frontend` starts from an empty migrated DB. Tests that assumed prior state (e.g. "registration succeeds because no user with this email exists") become more robust, not less.
- **Slight overhead per run.** Bringing up `db-e2e` + `backend-e2e` and waiting for migrations adds ~10–15 seconds to every `make test-frontend`. Acceptable; comparable to the existing `npm install` on every Playwright run.
- **No change to `make test-backend`.** Django's test runner already uses an in-memory SQLite via `nursery.test_settings`. That isolation is untouched.
- **Browser-side API calls in tests are unaffected.** They are mostly mocked via `page.route` today; the few that pass through hit the frontend container, which has no `/api` handler — a 404 today, a 404 tomorrow. Only server-side `page.request.*` calls (the ones that actually create test users / pets / schedules) now route to `backend-e2e`.

## Out of scope

- **Wiping the existing 482 polluted `e2e_*` users from the dev DB.** A separate one-off, presented to the operator as a follow-up. This change prevents new pollution; cleanup is a maintenance task.
- **Parallel e2e workers across multiple isolated DBs.** Playwright supports it, but each worker would need its own backend-e2e replica; not justified at the current test count.
- **A dedicated frontend-e2e container with `NEXT_PUBLIC_API_URL` baked at build time.** Would let browser-side calls reach `backend-e2e` directly, removing the need for `page.route` mocks on most tests. Bigger surface change; can land later if the test suite shifts toward full integration coverage.
- **Wiring `make security`'s Django checks into the e2e DB.** Security suite uses the in-memory SQLite already; no change.
