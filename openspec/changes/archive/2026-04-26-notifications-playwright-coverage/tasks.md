# Tasks — Notifications Playwright coverage

## Phase 1 — Test stability hooks

- [x] Add minimal `data-testid` attributes to the components under test:
  - `notification-bell`, `notification-bell-badge` (with `data-unread-count` on the bell).
  - `notification-row` (with `data-kind` and `data-unread`).
  - `forward-email`, `forward-whatsapp`.
  - `mark-all-read`, `dismiss-all`.

## Phase 2 — The spec itself

- [x] Create `frontend/tests/notifications.spec.ts`.
- [x] Stub `GET /api/feature-flags/` and `GET|POST /api/notifications/*` via `page.route()` instead of driving the real cron — the Playwright container can't `docker compose exec` into the backend (see design.md "Decision: A"). Backend coverage of the API contract lives in `notifications/tests/test_api.py`.
- [x] **9 tests, all passing**:
  - bell hidden when master flag is disabled.
  - `/notifications` empty when master flag is disabled.
  - bell renders with the unread count.
  - bell hides badge when nothing is unread.
  - `/notifications` renders one row per kind with read state markers.
  - `pet_birthday` row exposes a `mailto:` `forward-email` link with the seeded owner's email.
  - `pet_birthday` row exposes a `forward-whatsapp` link starting with `https://api.whatsapp.com/send` and NOT containing `wa.me`.
  - `pet_arriving_today` row has neither forward button.
  - mark-all-read button is disabled when nothing is unread.

## Phase 3 — CI integration

- [x] Confirmed: `make test-frontend` includes the new spec; suite runs in ≈14s for the new file.

## Phase 4 — Spec + archive

- [x] Live spec updated at `openspec/specs/frontend/notifications/spec.md` with the new "Playwright suite" requirement.
- [x] Archive this change folder.
