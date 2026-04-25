# Notifications system

## Why

Operators currently have no automated reminders for the recurring events that drive their work: pets arriving today / tomorrow, pets being picked up today / tomorrow, vaccinations and deworming treatments coming due, and pet birthdays. Today they have to manually scan the calendar, the pet list, and the vaccination records every morning to figure out what needs attention.

A notification system gives staff a single inbox of "what's relevant now" and lets them forward the right items to owners (vaccination / deworming reminders) with one click, without leaving the app.

## What

Build a notification system covering five kinds of events:

| Kind | Trigger |
|------|---------|
| **Vaccination due** | `last_vaccination_date + VaccinationType.due_after_days` is today or has passed |
| **Pet arriving** | A schedule's `start_date` is tomorrow or today |
| **Pet egress** | A schedule's `end_date` is tomorrow or today |
| **Pet birthday** | A pet's `birth_date` month-day matches today |
| **Deworming due** | `last_internal_deworming_date + N` or `last_external_deworming_date + N` is today or has passed (`N` = `NurserySetting.deworming_default_due_days`, default 90) |

Each notification has:
- A `kind`, a `pet`, an event_date, and a recipient `user`.
- A read / dismissed state per user (unread badge in the nav, dismiss button on each row).
- A "Forward to owner" affordance: a `mailto:owner.email?body=...` link (opens the staff member's mail client) and a `wa.me/<phone>?text=...` link (opens WhatsApp), each pre-filled with a templated message.

The system is gated by a master feature flag `notifications` (disabled by default). When the flag is on, individual notification kinds can be toggled per nursery in **Settings → Notifications**, alongside the daily run time.

## Scope (in)

- **Backend**:
  - New Django app `notifications` with a `Notification` model (one row per `(event, kind, user)`).
  - New per-user `NotificationPreference` model (currently just `email_enabled`).
  - New `VaccinationType.due_after_days` field.
  - New `NurserySetting` fields: `notifications_run_time`, `deworming_default_due_days`, and five per-kind boolean toggles.
  - A management command `generate_notifications` that's idempotent: running it twice in the same day MUST NOT produce duplicates.
  - A new `cron` service in `docker-compose.yml` that loops, polls the configured run time, and invokes the management command when matched.
  - REST endpoints under `/api/notifications/` for list, mark-read, dismiss.
  - Email delivery via Django's `send_mail()`. Configure `EMAIL_BACKEND`, `EMAIL_HOST*` env vars in `docker-compose.yml`. Default to the console backend in dev so nothing leaks during testing.
  - One new feature flag `notifications`, seeded `False`.
- **Frontend**:
  - Bell icon in the navigation with an unread badge.
  - A `/notifications` page listing every undismissed notification for the logged-in user, grouped by kind. Each row has a dismiss button and the two forward-to-owner buttons.
  - Toast on each new notification that arrives between polls (lightweight: just polls `/api/notifications/?since=<timestamp>`).
  - A new "Notifications" section on the Settings page covering: master enabled toggles per kind, the daily run time, and the deworming default cadence.
  - A per-user "Notification preferences" subsection inside the existing user dropdown / a small profile page (just an email-on/off toggle for now).
  - VaccinationType form gains a `due_after_days` input.
- **Translations**: new `notifications.*` namespace in EN / ES (titles, body templates, kind labels).

## Scope (out)

- **Telegram delivery** — explicitly deferred. We'll ship a follow-up change once v1 is in operators' hands.
- **SMS / push notifications** — out for v1.
- **Per-pet cadence overrides** (e.g. "this senior pet needs vaccination every 6 months") — operators can edit the pet's vaccination history; v1 uses the global per-vaccination-type cadence only.
- **Owner-bound notifications** (where the system itself emails owners) — replaced by the staff-driven "Forward to owner" buttons. Operators are the audience; they decide what to forward and when.
- **Notification batching / digest mode** — every notification is a discrete row.
- **Real-time push** — frontend polls every N seconds. No SSE / WebSockets.

## Approach

1. **Backend infrastructure** first: the `notifications` app, the `Notification` model, REST endpoints, and the management command. Verified by unit tests that drive the command against fixture data.
2. **Settings model + flag** changes: extend `NurserySetting`, `VaccinationType`, add the master flag.
3. **Email delivery**: configure Django mail (default console backend), wire `send_mail()` into the management command for each user with `email_enabled=True`. Tests stub the SMTP layer.
4. **Cron service**: add to `docker-compose.yml`. Image reuses the backend's; entrypoint is a tiny Python loop that polls `NurserySetting.notifications_run_time` and runs the management command when the wall-clock matches. Idempotency guarantees no duplicate work.
5. **Frontend**: bell + notification center page + toast on poll + Settings section.
6. **Forward-to-owner UX**: pure-frontend `mailto:` and `wa.me` link generation; templated messages live under `notifications.forward.*` translations.
7. **Documentation**: update `AGENTS.md` (commands table, env vars), `docs/docs/backend/intro.md` (new app + endpoints), `docs/docs/frontend/intro.md` (bell + center).
8. **Archive on the feature branch before merge** per the workflow rule.
