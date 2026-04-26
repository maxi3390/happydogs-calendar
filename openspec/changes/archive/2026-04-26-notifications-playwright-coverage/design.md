# Design — Notifications Playwright coverage

## How does the spec get notifications to assert against?

Three options were considered, in increasing complexity:

### A. Stub the API at the route level (chosen)

Use Playwright's `page.route()` to intercept `GET /api/notifications/?unread_only=1` and `GET /api/notifications/` and return canned responses. Pros: deterministic, no DB state, no flag toggling. Cons: tests the React component in isolation and can drift from the real API; the very class of bug we want to catch (state shape changing under our feet) doesn't surface.

### B. Pre-seed the DB with `Notification` rows directly

A Playwright `beforeAll` calls a tiny helper endpoint or runs `python manage.py seed_example_data --quiet` inside the `backend` container, then issues `POST /api/__test__/seed_notifications/` (a new test-only endpoint). Pros: realistic backend data flow. Cons: introduces a test-only endpoint that has to be flagged off in production.

### C. Drive the real cron via the existing management command

Same as B but uses `manage.py generate_notifications --today YYYY-MM-DD` directly. The seed fixture already includes pets whose `birth_date`, `last_*_deworming_date`, and `vaccination` records produce events on the seed day, so the cron run produces a known set of rows. The blocker: Playwright runs inside its own docker container connected to the `proxy` network and has no way to `docker compose exec` into the backend container.

### Decision: A

We pick **A** because:

1. The infrastructure constraint (Playwright can't reach the backend's CLI) makes B and C require new HTTP endpoints whose only consumer is the test harness. That's an ongoing maintenance burden for a test-only feature.
2. The bug class this spec exists to catch is "the React component renders the wrong thing for a given API shape." The shape itself is already covered by `notifications/tests/test_api.py` (23 assertions on the JSON contract). Stubbing the response with a fixture matching that shape gives Playwright something deterministic to render — which is exactly what we want.
3. The page.route() interception is also faster and immune to seed-data drift; nobody has to remember "the seeded vaccinations are stale, regenerate" before running the suite.

If the API contract drifts in a way the backend tests don't catch, the stub fixture in this spec gets out of date. That's a real risk, mitigated by:
- The fixture lives at the top of the spec file with named constants — drift is loud.
- The backend tests assert the same shape; a contract change has to land in lockstep.

The trade-off is documented; future contributors may choose to switch to B/C if they decide this safety net isn't enough.

## Authentication

The other Playwright specs (`auth.spec.ts`, `pets.spec.ts`, etc.) authenticate via a localStorage-seeding helper. We reuse that — no new auth path. The seeded admin account `sofia@happydogs.example` is the one that receives notifications.

## Determinism — running the spec twice in the same minute

The cron is idempotent (natural-key UniqueConstraint on Notification), so re-running `generate_notifications` produces no duplicate rows. The spec can call it as many times as needed without flake.

The bell-badge poll interval is 60s in production. The spec doesn't wait for a poll; it uses the existing "navigate, observe, click, navigate back" pattern that the other specs use, which avoids the 60s wait entirely.

## How is the master flag toggled in the spec?

The flag toggle is admin-only (`PATCH /api/feature-flags/notifications/`). The seeded admin user is already authenticated, so the spec just hits the endpoint directly via `request.fetch()`. No need to drive the admin UI.

## Why not parallelise across the per-kind assertions?

Playwright parallelism shares a single backend, and the cron generates rows for ALL active staff users. Running multiple specs that mutate Notification rows would cause cross-test pollution. The current Playwright config already runs `--workers=1` for similar reasons, so this is a non-issue — but worth noting if anyone tries to crank up parallelism later.

## What about flake from the 60s poll interval?

The `NotificationBell` polls every 60s. A naive test would: load page, mark-read, then expect badge to update — and fail because the next poll is 59 seconds away. Two ways out:

1. Reload the page (cheapest, what we'll do).
2. Reduce the poll interval via a dedicated `process.env.NEXT_PUBLIC_NOTIFICATION_POLL_MS` variable.

We pick reload-on-assert because it's a five-line spec helper instead of a config knob that ships to production.
