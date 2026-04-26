# Backend: Notifications Specification

## Purpose

Daily-cron-driven reminders for staff. Surface upcoming or due events (vaccination, deworming, pet birthdays, schedule arrivals/egresses) as one in-app row per active staff user with independent read / dismissed state, and optionally one staff-internal email per row. The forward-to-owner affordance (mailto: + wa.me) is rendered by the frontend; operator-overridable templates fill its content.

The system is gated by the master `notifications` feature flag (off by default). Per-kind toggles in `NurserySetting` further filter which event families fire.

## Requirements

### Requirement: Notification SHALL be a per-user record of an upcoming or due event

The system SHALL provide a `Notification` model storing one row per `(kind, pet, event_date, recipient_user, schedule, vaccination)` tuple. Each row SHALL track:

- `kind` — one of `vaccination_due`, `pet_arriving_tomorrow`, `pet_arriving_today`, `pet_egress_tomorrow`, `pet_egress_today`, `pet_birthday`, `deworming_internal_due`, `deworming_external_due`.
- `pet` (FK to `Pet`) — non-nullable; CASCADE delete.
- `schedule` (FK to `Schedule`, nullable) — set for arriving / egress kinds.
- `vaccination` (FK to `Vaccination`, nullable) — set for `vaccination_due`.
- `event_date` — the day the event happens (arrival, egress, birthday, due date).
- `recipient_user` (FK to `User`) — the staff user this notification is for.
- `payload` — JSON of per-kind extras (time slot, vax type, deworming side, …).
- `created_at`, `read_at`, `dismissed_at`.

The combination `(kind, pet, event_date, recipient_user, schedule, vaccination)` SHALL be unique. The management command MUST use `get_or_create()` keyed on this combination so re-running on the same day produces no duplicates.

#### Scenario: Re-running the cron is idempotent

- GIVEN a notification already exists for `(kind="pet_arriving_today", pet=Luna, event_date=today, recipient_user=Alice)`
- WHEN the management command runs again the same day
- THEN no second row SHALL be created
- AND the existing row's `created_at` SHALL not change
- AND no second email SHALL be sent

#### Scenario: Cascade on pet delete

- GIVEN a notification exists for some pet
- WHEN that pet is deleted
- THEN the notification row SHALL be deleted automatically

### Requirement: `generate_notifications` management command SHALL produce per-user rows for every relevant event

When the `notifications` feature flag is enabled, the command SHALL, for every active staff user, materialise notifications for:

1. Every `Vaccination` whose latest `date + VaccinationType.due_after_days` is `<= today`, when the matching `VaccinationType.due_after_days` is greater than 0 AND `NurserySetting.notifications_vaccination_enabled` is True.
2. Every `Schedule` with `start_date == today` (kind `pet_arriving_today`) or `start_date == today + 1` (kind `pet_arriving_tomorrow`) whose `status` is `scheduled` or `checked_in`, when `NurserySetting.notifications_arrivals_enabled` is True.
3. Every `Schedule` with `end_date == today` (kind `pet_egress_today`) or `end_date == today + 1` (kind `pet_egress_tomorrow`) whose `status` is `scheduled` or `checked_in`, when `NurserySetting.notifications_egress_enabled` is True.
4. Every `Pet` whose `birth_date` month-day matches today, when `NurserySetting.notifications_birthdays_enabled` is True.
5. Every `Pet` whose `last_internal_deworming_date + NurserySetting.deworming_default_due_days <= today` (kind `deworming_internal_due`) and the same for external, when `NurserySetting.notifications_deworming_enabled` is True.

The command SHALL also dismiss any notification whose `event_date < today - 7 days` (auto-cleanup).

When the `notifications` feature flag is disabled, the command SHALL exit immediately and produce no rows.

#### Scenario: Master flag disabled is a no-op

- GIVEN the `notifications` feature flag is disabled
- WHEN the management command runs
- THEN no `Notification` rows SHALL be created
- AND no emails SHALL be sent

#### Scenario: A per-kind toggle disabled skips that kind only

- GIVEN the `notifications` feature flag is enabled
- AND `NurserySetting.notifications_birthdays_enabled` is False
- AND every other `notifications_*_enabled` is True
- WHEN the management command runs on a day where Luna has a birthday and Milo arrives
- THEN a `pet_arriving_today` (or `_tomorrow`) row SHALL be created for Milo
- AND no `pet_birthday` row SHALL be created for Luna

#### Scenario: A pet with no vaccinations is silent

- GIVEN a pet has zero `Vaccination` rows
- WHEN the management command runs
- THEN no `vaccination_due` notification SHALL be created for that pet

#### Scenario: A pet with no birth_date is silent on birthdays

- GIVEN a pet's `birth_date` is `NULL`
- WHEN the management command runs
- THEN no `pet_birthday` notification SHALL be created for that pet

#### Scenario: A vaccination type with `due_after_days = 0` does not recur

- GIVEN `VaccinationType("rabies").due_after_days = 0`
- AND a pet has a 5-year-old rabies vaccination on file
- WHEN the management command runs
- THEN no `vaccination_due` notification SHALL be created for that vaccination

#### Scenario: Cancelled schedules are not surfaced

- GIVEN a schedule with `status = "cancelled"` and `start_date = today`
- WHEN the management command runs
- THEN no `pet_arriving_today` notification SHALL be created for that schedule

#### Scenario: Auto-cleanup removes stale notifications

- GIVEN a notification with `event_date = today - 8 days` and `dismissed_at = NULL`
- WHEN the management command runs today
- THEN the row's `dismissed_at` SHALL be set to `now()`

### Requirement: REST API SHALL expose the user's notifications

The system SHALL provide REST endpoints under `/api/notifications/`:

- `GET /api/notifications/` — list undismissed notifications for the logged-in user, ordered by `event_date` descending then `created_at` descending. Optional query: `?unread_only=1` returns only rows where `read_at IS NULL`.
- `POST /api/notifications/{id}/mark_read/` — set `read_at = now()`. Idempotent.
- `POST /api/notifications/{id}/dismiss/` — set `dismissed_at = now()`. Idempotent.
- `POST /api/notifications/mark_all_read/` — set `read_at = now()` on every undismissed and currently unread notification for the logged-in user. Returns `{"marked_read": n}`. Idempotent: a second call with no remaining unread rows returns `marked_read: 0`. Already-read rows SHALL NOT have their `read_at` overwritten.
- `POST /api/notifications/dismiss_all/` — set `dismissed_at = now()` on every undismissed notification for the logged-in user.
- `GET /api/notifications/preferences/` — return the logged-in user's `NotificationPreference` (creating it with defaults if absent).
- `PATCH /api/notifications/preferences/` — update the logged-in user's preferences.

A user SHALL only ever see and act on their own notifications. Cross-user reads, dismisses, or preference edits SHALL fail with HTTP 404.

#### Scenario: A user cannot dismiss another user's notification

- GIVEN user Alice has notification id 42
- AND user Bob is logged in
- WHEN Bob `POST /api/notifications/42/dismiss/`
- THEN the response SHALL be HTTP 404
- AND notification 42's `dismissed_at` SHALL remain `NULL`

#### Scenario: `dismiss_all` only affects the caller's notifications

- GIVEN Alice has 3 undismissed notifications and Bob has 5
- WHEN Alice `POST /api/notifications/dismiss_all/`
- THEN Alice's 3 notifications SHALL all have `dismissed_at` set
- AND Bob's 5 SHALL be untouched

#### Scenario: `mark_all_read` only touches the caller's unread, non-dismissed notifications

- GIVEN Alice has 1 unread + 1 already-read + 1 dismissed notification
- AND Bob has 1 unread notification
- WHEN Alice `POST /api/notifications/mark_all_read/`
- THEN the response SHALL be HTTP 200 with `{"marked_read": 1}`
- AND Alice's previously-unread row SHALL have a non-null `read_at`
- AND Alice's already-read row's `read_at` SHALL be unchanged (not overwritten)
- AND Alice's dismissed row's `read_at` SHALL remain `NULL`
- AND Bob's row SHALL remain unread

#### Scenario: `mark_all_read` is idempotent

- GIVEN Alice has just called `mark_all_read` and her inbox has no remaining unread rows
- WHEN she calls `POST /api/notifications/mark_all_read/` again
- THEN the response SHALL be HTTP 200 with `{"marked_read": 0}`

#### Scenario: GET preferences creates defaults on first call

- GIVEN a user has no `NotificationPreference` row
- WHEN they `GET /api/notifications/preferences/`
- THEN the response SHALL be HTTP 200
- AND a row SHALL be created with `email_enabled = True`
- AND the response body SHALL reflect the defaults

### Requirement: Email delivery SHALL respect the per-user `email_enabled` toggle

When the `generate_notifications` command newly creates a notification (i.e. `get_or_create` returned `created=True`), the system SHALL send a staff-internal email to the recipient user IF AND ONLY IF that user's `NotificationPreference.email_enabled` is `True`. The email's subject and body come from operator-overridable templates with localised defaults under `notifications.staff_email.<scope>.{subject,body}` (for kinds with a template scope) or `notifications.staff_email.<kind>.{subject,body}` (for internal-only kinds). The recipient SHALL be the user's own email address (NOT the pet owner's).

When `get_or_create` returned `created=False` (the notification already existed from an earlier cron run today), no email SHALL be sent.

#### Scenario: Email opt-out is honoured

- GIVEN Alice has `NotificationPreference.email_enabled = False`
- WHEN the cron creates a new notification for Alice
- THEN the bell-icon row SHALL appear for Alice on next poll
- AND no email SHALL be sent

#### Scenario: No email on subsequent re-runs of the same day

- GIVEN the cron has already created a notification for Bob today and an email was sent
- WHEN the cron runs again the same day
- THEN no second email SHALL be sent

### Requirement: NotificationTemplate SHALL provide per-nursery message templates for owner-bound notifications

The system SHALL provide a `NotificationTemplate` model with one row per scope. The supported scopes in v1 are:

| Scope | Used by kinds |
|-------|---------------|
| `treatment_due` | `vaccination_due`, `deworming_internal_due`, `deworming_external_due` |
| `pet_birthday` | `pet_birthday` |

Each row SHALL carry three text fields: `email_subject`, `email_body`, and `whatsapp_text`. All three SHALL be blank by default. An empty field SHALL fall back to the localised default in the user's preferred language under `notifications.forward.<scope>.email.{subject,body}` / `notifications.forward.<scope>.whatsapp.text`.

The `scope` field SHALL be unique. Rows SHALL be materialised on first read via `get_or_create` so a fresh deployment always exposes both scopes (with empty fields → using defaults).

REST endpoints `GET /api/notification-templates/` and `PATCH /api/notification-templates/{scope}/` SHALL expose the templates. POST and DELETE SHALL be unsupported (the catalog of scopes is fixed in v1).

#### Scenario: First read materialises both scopes

- GIVEN a fresh database with no `NotificationTemplate` rows
- WHEN an operator `GET /api/notification-templates/`
- THEN the response SHALL contain exactly two rows — `treatment_due` and `pet_birthday`
- AND every text field on each row SHALL be empty

#### Scenario: Operator edits the treatment-due email body

- GIVEN the operator opens the Settings → Notifications → Message templates UI
- WHEN they type a custom email body for the `treatment_due` scope and save
- THEN a `PATCH /api/notification-templates/treatment_due/` SHALL persist the new value
- AND subsequent calls to `GET /api/notifications/` SHALL render the operator's text in the `forward.email.body` field of every `vaccination_due` and `deworming_*_due` row

#### Scenario: Empty fields fall back to localised defaults

- GIVEN the operator's `treatment_due.whatsapp_text` is empty
- AND the logged-in user's preferred language is Spanish
- WHEN the system renders a `vaccination_due` notification's `forward.whatsapp.text`
- THEN the rendered text SHALL come from the Spanish `notifications.forward.treatment_due.whatsapp.text` translation

#### Scenario: Internal-only kinds expose `forward = null`

- GIVEN a `pet_arriving_today` notification
- WHEN the row is serialised
- THEN its `forward` field SHALL be `null`
- AND the frontend SHALL NOT render any forward-to-owner buttons on that row

#### Scenario: Missing placeholder in operator template renders the literal

- GIVEN the operator's `treatment_due.email_body` contains `Hi {nonexistent_placeholder}`
- WHEN the system renders the field for a notification
- THEN the rendered output SHALL contain the literal text `Hi {nonexistent_placeholder}`
- AND no exception SHALL be raised

#### Scenario: Hidden buttons when contact info is absent

- GIVEN a notification whose pet has an owner with `email = ""` and `phone = ""`
- WHEN the row is serialised
- THEN `forward.email.to` SHALL be `null` AND `forward.whatsapp.phone` SHALL be `null`
- AND the frontend SHALL hide both forward buttons on that row

### Requirement: Daily scheduling container SHALL invoke the command at the configured time

The `notification-cron` docker-compose service SHALL run a polling loop (`run_notification_scheduler` management command) that:

- Reads `NurserySetting.notifications_run_time` once per minute.
- When the wall-clock time `>=` the configured time AND no `Notification` row has been created today yet, calls `generate_notifications`.
- Sleeps 60 seconds and repeats.

Operators changing `notifications_run_time` in Settings SHALL see the change take effect on the next loop iteration without restarting the container.

#### Scenario: Time change picks up on the next iteration

- GIVEN the `notification-cron` service is running
- AND `notifications_run_time = 07:00`
- WHEN an operator changes the value to `09:00` at 06:55
- THEN the cron SHALL NOT fire at 07:00
- AND it SHALL fire at 09:00 (or the first iteration thereafter)
