# Tasks — Notifications system

## Phase 1 — Backend: new `notifications` app + models

- [x] Create `backend/notifications/` Django app (models, serializers, views, urls, tests).
- [x] Add `Notification` model with the natural-key unique constraint, indexes, and `ordering`.
- [x] Add `NotificationPreference` model (one-to-one to `User`, just `email_enabled` for now).
- [x] Register the app in `INSTALLED_APPS`.
- [x] Generate migration.
- [x] Wire URLs under `/api/notifications/`.

## Phase 2 — Backend: settings + flag changes

- [x] Extend `NurserySetting` with the five `notifications_*_enabled` booleans, `notifications_run_time`, and `deworming_default_due_days`. Generate migration.
- [x] Extend `VaccinationType` with `due_after_days` (default 365). Generate migration.
- [x] Add new feature flag `notifications` (disabled by default) in a `feature_flags` seed migration.
- [x] Update `feature_flags.tests.SEEDED_KEYS` to include `notifications`.

## Phase 3 — Backend: REST endpoints

- [x] `GET /api/notifications/` — list undismissed for the logged-in user (optional `unread_only=1`).
- [x] `POST /api/notifications/{id}/mark_read/`.
- [x] `POST /api/notifications/{id}/dismiss/`.
- [x] `POST /api/notifications/dismiss_all/`.
- [x] `GET /api/notifications/preferences/`.
- [x] `PATCH /api/notifications/preferences/`.
- [x] Tests: pagination, ownership enforcement (one user can't read or dismiss another's notifications), `unread_only` filter.

## Phase 4 — Backend: management command `generate_notifications`

- [x] Implement `vaccinations_due_today(today)` helper that joins `Vaccination` + `VaccinationType.due_after_days`.
- [x] Implement `schedules_arriving_today_or_tomorrow(today)` helper (status in `scheduled` / `checked_in`).
- [x] Implement `schedules_egress_today_or_tomorrow(today)` helper.
- [x] Implement `pets_with_birthday_today(today)` helper (matching month + day).
- [x] Implement deworming-due helpers (one per side).
- [x] Implement `upsert(...)` using `Notification.objects.update_or_create()` keyed on the natural key.
- [x] Implement auto-cleanup: dismiss notifications with `event_date < today - 7d`.
- [x] Master flag short-circuit: when `notifications` flag is off, exit early.
- [x] Per-kind short-circuits using the `NurserySetting.*_enabled` booleans.
- [x] Tests: idempotency (re-running produces no duplicates), each kind-specific helper, master-flag-off no-op, per-kind toggle, auto-cleanup.

## Phase 5 — Backend: email delivery

- [x] Configure `EMAIL_BACKEND` in `backend/nursery/settings.py`. Default to `django.core.mail.backends.console.EmailBackend` in dev.
- [x] Add the SMTP env vars to `docker-compose.yml` and `.env.example`.
- [x] Wire `send_mail()` into the management command for newly-created notifications whose recipient has `email_enabled=True`.
- [x] Templated subject / body live in `notifications.email.<kind>` translations.
- [x] Tests: stub SMTP (`mail.outbox`), assert the right recipient + subject for each kind, assert `email_enabled=False` skips delivery.

## Phase 6 — Backend: cron container

- [x] Implement `run_notification_scheduler` management command (the polling loop).
- [x] Add `cron` service to `docker-compose.yml` reusing the backend image.
- [x] Verify the service starts cleanly via `docker compose up cron` and waits for the configured run time.
- [x] Document the service in AGENTS.md (one-liner under "Docker services").

## Phase 7 — Frontend: domain wrapper + types

- [x] New `frontend/src/domain/notifications/{api,types}.ts`.
- [x] Re-export through `lib/api.ts` (`api.notifications`).
- [x] Type the response shape and the per-kind payloads.

## Phase 8 — Frontend: NotificationBell component

- [x] `NotificationBell.tsx` — bell icon + unread count badge.
- [x] Polls `/api/notifications/?unread_only=1` every 60s using a custom hook.
- [x] Render only when the `notifications` feature flag is enabled.
- [x] Wire into `Navigation.tsx`.

## Phase 9 — Frontend: Notifications center page

- [x] `/notifications` page with auth guard.
- [x] Group rows by kind with per-kind icons + titles.
- [x] Each row: localized title, localized body (using the payload), two forward-to-owner buttons (`mailto:`, `wa.me`), a Dismiss (X).
- [x] Bulk "Dismiss all" button.
- [x] Empty state ("Nothing today").

## Phase 10 — Frontend: Settings + per-user preferences

- [x] Add a "Notifications" section to `frontend/src/app/settings/page.tsx`:
  - Per-kind toggles (5 booleans).
  - Daily run time picker (`<input type="time">`).
  - Deworming default cadence (number input).
- [x] Add a "Notification preferences" panel for the logged-in user (in profile or as a Settings sub-section): `email_enabled` toggle.
- [x] VaccinationType form: `due_after_days` input (default 365, accept 0 for "non-recurring").

## Phase 11 — Translations

- [x] EN / ES strings under `notifications.*`:
  - `notifications.title`, `notifications.empty`, `notifications.dismissAll`.
  - `notifications.kinds.<kind>.title` and `.body` (template strings with `{name}`, `{date}`, …).
  - `notifications.forward.email.subject` / `.body`, `notifications.forward.whatsapp.text`.
  - Settings strings.

## Phase 12 — Docs

- [x] AGENTS.md — add the cron service to "Docker services", add `EMAIL_*` to env vars table.
- [x] docs/docs/backend/intro.md — new `notifications` app section, endpoints, model.
- [x] docs/docs/frontend/intro.md — bell component, /notifications page, Settings additions.

## Phase 13 — OpenSpec deltas

- [x] `specs/backend/notifications/spec.md` — new capability spec (model, endpoints, management command behavior).
- [x] `specs/backend/settings/spec.md` — additions for the new NurserySetting fields.
- [x] `specs/backend/vaccinations/spec.md` — `due_after_days` semantics.
- [x] `specs/backend/feature-flags/spec.md` — append `notifications` to the canonical list.
- [x] `specs/frontend/notifications/spec.md` — bell + center.
- [x] `specs/frontend/settings/spec.md` — new Notifications section + per-user preferences.

## Phase 14 — Archive (on this feature branch, before merge)

- [x] Move `openspec/changes/notifications-system/` → `openspec/changes/archive/<YYYY-MM-DD>-notifications-system/`.
- [x] Merge each delta into the corresponding live spec.
- [x] Single `chore(archive): ...` commit on the feature branch.

## Verification

- [x] All backend tests green (`make test-backend`).
- [x] Frontend typecheck clean.
- [x] Frontend Playwright tests for the touched suites still green.
- [x] Manual smoke: enable the flag, create a pet with a vaccination 365 days ago, run `python manage.py generate_notifications`, see the row appear in the bell, dismiss it, see it disappear.

## Known follow-ups (NOT in this change)

- Telegram delivery (with linking flow).
- Per-pet cadence overrides.
- SMS / push notifications.
- Real-time delivery (SSE / WebSockets) instead of polling.
- Owner-bound notifications (the system itself emails owners on a schedule).
