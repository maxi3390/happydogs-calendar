# Design — Notifications system

## High-level shape

A new `notifications` Django app owns:

- A `Notification` model — one row per `(event, kind, recipient_user)`.
- A `NotificationPreference` model — one row per user, currently just `email_enabled`.
- A management command `generate_notifications` — the brain of the system. Computes which notifications are due today, materialises rows for every staff user, sends emails for users that opted in.
- REST endpoints for list / mark-read / dismiss.

A separate `cron` container in `docker-compose.yml` invokes the management command at the configured nursery time once per day.

The frontend has a bell in the navigation that polls `/api/notifications/`, a `/notifications` page with the full list, and a Settings section for the per-kind toggles, the daily run time, and the deworming cadence.

## Decision summary

| Decision | Choice | Why |
|----------|--------|-----|
| **Per-user rows, not shared rows + per-user join** | One `Notification` row per `(event, kind, recipient_user)` | Simpler queries (`Notification.objects.filter(recipient_user=request.user)`), simpler dismiss semantics (just set `dismissed_at` on the row), simpler email delivery (loop over rows, not over a join). Cost is data duplication: ~5 staff × 10 notifications/day = 50 rows/day = 18k rows/year. Negligible. |
| **Idempotency via natural-key dedup** | Management command upserts on `(kind, pet_id, event_date, recipient_user_id, schedule_id, vaccination_id)` | Running the cron twice in the same day MUST NOT spam staff. The natural key covers every dimension that distinguishes a notification. |
| **Master flag + per-kind toggles in Settings** | One `notifications` feature flag (off by default) gates the whole system. Five `NurserySetting.notifications_*_enabled` booleans gate each kind. | Lets operators toggle a kind off without a deploy. Lets us ship v1 disabled and only flip the flag once a nursery is ready. |
| **Cron via docker-compose service** | Separate `cron` container, image reuses the backend's, entrypoint is a small Python loop | No new dependencies (no Celery, no APScheduler). Loop polls the DB for `notifications_run_time` every minute and fires the command when the wall-clock matches and we haven't already fired today. Trivial to reason about. |
| **Email delivery via Django core mail** | `django.core.mail.send_mail()` from inside the management command | No third-party dependency. Default to the console backend in dev (`EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend'`). Operators configure SMTP via env vars in production. |
| **Owner forwarding via `mailto:` / `wa.me`** | Pure-frontend, no backend send | Keeps the system out of the "is this email deliverable to the owner?" rabbit-hole. Staff own the action; the system just pre-fills a templated message. |
| **Telegram deferred to v2** | Not implemented in v1 | Adding a webhook endpoint or a polling worker for the bot is a non-trivial extra. Better to ship the rest first. |
| **Cadence config: per-vaccination-type + global deworming** | `VaccinationType.due_after_days` (per type, default 365) + `NurserySetting.deworming_default_due_days` (global, default 90) | Different vaccines have different cadences (rabies vs. distemper); deworming cadences are uniform per nursery. Per-pet override is out of scope; operators can edit the pet's vaccination history if a one-off is needed. |
| **Auto-cleanup after the event** | Notifications older than `event_date + 7 days` are auto-dismissed during each cron run | Keeps the bell from accumulating ancient noise. 7 days is enough that staff who took yesterday off don't lose context. |
| **Read state semantics** | `read_at` (set when staff opens the notification center), `dismissed_at` (set when staff clicks the X). Bell badge counts where both are NULL. | Two-state UX: staff can browse without committing to dismissing; explicit dismiss is the inbox-zero gesture. |

## Data model

### `notifications.Notification`

```python
class Notification(models.Model):
    KIND_CHOICES = [
        ('vaccination_due', 'Vaccination due'),
        ('pet_arriving_tomorrow', 'Pet arriving tomorrow'),
        ('pet_arriving_today', 'Pet arriving today'),
        ('pet_egress_tomorrow', 'Pet egress tomorrow'),
        ('pet_egress_today', 'Pet egress today'),
        ('pet_birthday', 'Pet birthday'),
        ('deworming_internal_due', 'Internal deworming due'),
        ('deworming_external_due', 'External deworming due'),
    ]

    kind = models.CharField(max_length=40, choices=KIND_CHOICES)
    pet = models.ForeignKey('pets.Pet', on_delete=models.CASCADE, related_name='notifications')
    schedule = models.ForeignKey(
        'pets.Schedule', null=True, blank=True, on_delete=models.CASCADE,
        help_text="Set for pet_arriving_* / pet_egress_* kinds; NULL otherwise."
    )
    vaccination = models.ForeignKey(
        'pets.Vaccination', null=True, blank=True, on_delete=models.CASCADE,
        help_text="Set for vaccination_due; NULL otherwise."
    )
    event_date = models.DateField(help_text="The day the event happens (arrival / egress / birthday / due date).")
    recipient_user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='notifications')
    payload = models.JSONField(
        default=dict,
        help_text="Per-kind extras (e.g. vax_type, deworming side, schedule time slot)."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['kind', 'pet', 'event_date', 'recipient_user',
                        'schedule', 'vaccination'],
                name='notifications_natural_key',
            ),
        ]
        indexes = [
            models.Index(fields=['recipient_user', 'dismissed_at']),
            models.Index(fields=['recipient_user', 'read_at']),
        ]
        ordering = ['-event_date', '-created_at']
```

The `UniqueConstraint` carries the idempotency invariant: each cron run uses `Notification.objects.update_or_create(natural_key, defaults=...)` so re-running on the same day is a no-op.

`schedule` and `vaccination` are nullable but participate in the unique key — Postgres treats `NULL` as distinct in a unique index by default, so we'll need a partial-index workaround OR include them with an explicit `NOT NULL` strategy by storing `0` sentinels. Simpler: keep the constraint as listed and rely on the idempotent management-command logic to never produce two notifications with the same other fields when these are null. (Trade-off documented; revisit if Postgres semantics bite.)

### `notifications.NotificationPreference`

```python
class NotificationPreference(models.Model):
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='notification_preference')
    email_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
```

Telegram fields will be added in the v2 follow-up.

### `nursery_settings.NurserySetting` additions

```python
notifications_run_time = models.TimeField(
    default=time(7, 0),
    help_text="Time of day the notifications cron generates and sends out the day's notifications.",
)
deworming_default_due_days = models.PositiveIntegerField(
    default=90,
    help_text="Days after a deworming treatment before the next is considered due.",
)
notifications_vaccination_enabled = models.BooleanField(default=True)
notifications_arrivals_enabled = models.BooleanField(default=True)
notifications_egress_enabled = models.BooleanField(default=True)
notifications_birthdays_enabled = models.BooleanField(default=True)
notifications_deworming_enabled = models.BooleanField(default=True)
```

Each per-kind boolean defaults `True` — once the master flag is flipped on, every kind is active by default. Operators flip individual kinds off later if any kind turns out to be too noisy.

### `vaccinations.VaccinationType` addition

```python
due_after_days = models.PositiveIntegerField(
    default=365,
    help_text="How many days after a vaccination before the next is considered due. 0 means non-recurring (no notification fires).",
)
```

`0` is the "never recur" escape hatch (e.g., a one-off vax on intake).

### Feature flag

A single new flag, seeded disabled:

```python
{
    'key': 'notifications',
    'label': 'Notifications',
    'description': (
        'Master switch for the notifications system. When enabled, the daily '
        'cron job generates per-staff notifications for upcoming events '
        '(vaccinations, arrivals, egress, birthdays, deworming) and the bell '
        'icon + center are visible. Per-kind toggles live in Settings.'
    ),
    'enabled': False,
}
```

## The management command — `generate_notifications`

Pseudocode:

```python
def handle():
    today = date.today()
    settings = NurserySetting.load()
    if not is_feature_enabled('notifications'):
        return  # Master switch off — no-op.

    staff = User.objects.filter(is_active=True)
    if not staff.exists():
        return

    if settings.notifications_vaccination_enabled:
        for v in vaccinations_due_today(today):
            for u in staff:
                upsert(kind='vaccination_due', pet=v.pet, vaccination=v, event_date=v.next_due_date(), recipient_user=u, payload={...})

    if settings.notifications_arrivals_enabled:
        for s in schedules_arriving_today_or_tomorrow(today):
            kind = 'pet_arriving_today' if s.start_date == today else 'pet_arriving_tomorrow'
            for u in staff:
                upsert(kind=kind, pet=s.pet, schedule=s, event_date=s.start_date, recipient_user=u, payload={'time_slot': ...})

    # ... egress, birthday, deworming ...

    # Auto-cleanup
    Notification.objects.filter(event_date__lt=today - timedelta(days=7)).update(dismissed_at=now())

    # Email delivery
    for n in newly_created_or_updated_notifications:
        if n.recipient_user.notification_preference.email_enabled:
            send_email(n)
```

Key invariants:

- **Idempotent**: re-running on the same day produces no duplicate rows (uniqueness constraint + `update_or_create`). The "newly_created" list is only the rows where `created_at == now()`.
- **Closed-world**: doesn't fire kinds whose per-kind `notifications_*_enabled` is `False`.
- **No-op when master flag is off**: the cron container can stay running; flipping the flag toggles real work.
- **Auto-purge**: notifications whose event was more than 7 days ago are auto-dismissed so the bell doesn't accumulate stale rows.

## The `cron` docker-compose service

A small dedicated container, image is the backend image (so it has the same Python deps + access to the same DB):

```yaml
cron:
  build: ./backend
  command: python manage.py run_notification_scheduler
  environment:
    POSTGRES_HOST: db
    # ...same as backend
  depends_on:
    db:
      condition: service_healthy
  restart: unless-stopped
```

`run_notification_scheduler` is a tiny new management command that loops:

```python
def handle():
    last_run_date = None
    while True:
        now = timezone.now()
        run_time = NurserySetting.load().notifications_run_time
        if now.time() >= run_time and last_run_date != now.date():
            call_command('generate_notifications')
            last_run_date = now.date()
        time.sleep(60)
```

This avoids: a separate scheduler library, OS cron's reload-after-config-change pain, and the surprise of "the time was changed in Settings but cron didn't notice".

## REST API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/notifications/` | List the logged-in user's undismissed notifications. Optional `?unread_only=1` filter. |
| `POST` | `/api/notifications/{id}/mark_read/` | Set `read_at = now()`. |
| `POST` | `/api/notifications/{id}/dismiss/` | Set `dismissed_at = now()`. |
| `POST` | `/api/notifications/dismiss_all/` | Bulk-dismiss every undismissed notification for the user. |
| `GET` | `/api/notifications/preferences/` | Return the logged-in user's preferences (`email_enabled`). |
| `PATCH` | `/api/notifications/preferences/` | Update preferences. |

## Frontend

- **Bell icon** in `Navigation.tsx`. Polls `/api/notifications/?unread_only=1` every 60s, shows a count badge.
- **`/notifications` page**: full list, grouped by kind. Each row:
  - Title (kind-specific, translated)
  - Body (templated, e.g. *"Luna's annual vaccination is due today (last given 2025-05-01)"*)
  - Two buttons: "Email owner" → `mailto:owner.email?subject=...&body=...`, "WhatsApp owner" → `wa.me/<phone>?text=...` (only rendered when the owner has the relevant contact field).
  - Dismiss (X) button.
- **Settings → Notifications** section: per-kind toggles, daily run time picker, deworming default cadence input.
- **User dropdown → "Notification preferences"**: small per-user page with the `email_enabled` toggle.

## Edge cases

- **A pet has no vaccinations recorded**: don't fire vaccination_due. Otherwise we'd notify on every pet's intake forever.
- **A pet has no `birth_date`**: don't fire birthday. Same reasoning.
- **A staff user is created or deleted**: the next cron run produces / stops producing rows for them automatically. We don't backfill missed days for new users.
- **A schedule's `start_date` is today, but its `status` is `cancelled`**: skip. Only `scheduled` and `checked_in` count.
- **`VaccinationType.due_after_days = 0`**: that vaccination never produces a notification, even if a record exists. This is the explicit non-recurring opt-out.
- **`NurserySetting.notifications_run_time = 23:59` but the cron container was offline at that minute**: the loop catches up at the next iteration the next day. Auto-purge ensures we don't double-fire.
- **Two cron containers running by mistake**: each tries to upsert; the unique constraint enforces single-row-per-natural-key. Email delivery would double-send though — small enough risk to accept; we document "run exactly one cron service".
- **Frontend polling cadence vs notifications run time**: bell shows new items within 60s of the cron writing them. Acceptable for a daily system.

## Files touched (planned)

| Layer | Path | Change |
|-------|------|--------|
| Backend | `backend/notifications/` (new app) | Models, serializers, viewsets, two management commands, tests |
| Backend | `backend/nursery/settings.py` | Register the new app, configure `EMAIL_BACKEND` (default to console) |
| Backend | `backend/nursery_settings/models.py` + migration | New fields |
| Backend | `backend/domain/vaccinations/models.py` + migration | New `due_after_days` field on `VaccinationType` |
| Backend | `backend/feature_flags/migrations/` | New seed migration for the `notifications` flag |
| Backend | `backend/translations/{en,es}.json` | New `notifications.*` namespace |
| Compose | `docker-compose.yml` | New `cron` service. New env vars: `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL` |
| Compose | `.env.example` | Same |
| Frontend | `frontend/src/domain/notifications/{api,types}.ts` (new) | API wrapper |
| Frontend | `frontend/src/lib/api.ts` | Re-export |
| Frontend | `frontend/src/components/NotificationBell.tsx` (new) | Polling + badge |
| Frontend | `frontend/src/components/Navigation.tsx` | Render the bell |
| Frontend | `frontend/src/app/notifications/page.tsx` (new) | The center |
| Frontend | `frontend/src/app/settings/page.tsx` | New "Notifications" section |
| Frontend | `frontend/src/app/profile/notifications/page.tsx` (new) or a Settings sub-section | Per-user preferences |
| Docs | `AGENTS.md`, `docs/docs/backend/intro.md`, `docs/docs/frontend/intro.md` | New app, endpoints, UI |
