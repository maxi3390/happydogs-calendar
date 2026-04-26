# Notification fan-out — limit to recently-active users

## Why

`generate_for_date()` currently fans out every event to **every** `User.objects.filter(is_active=True)`. On a fresh install that's fine; in dev it's already producing ~250× per-event amplification because of accumulated test users; in production it'll drift the same way as old employees, abandoned accounts, and hand-created admins pile up over years.

Concretely, with the seed dataset (10 events on day-of-seed) the cron creates 2,460 `Notification` rows for a 246-user dev DB. Real production with 50 staff and 30-day retention would produce ~15,000 rows after a month — almost all of them belonging to people who haven't logged in in 9 months. They'll never see the inbox row, but each user's `email_enabled=True` preference still triggers the SMTP send loop on every cron run, generating undeliverable mail or staff annoyance for ex-employees.

We need a sharper definition of "active" than `is_active`.

## What

Add a `notification_recipient_lookback_days` setting (default 30) to `NurserySetting`. The cron's recipient query becomes:

```python
recipients = User.objects.filter(
    is_active=True,
    last_login__gte=now - timedelta(days=settings.notification_recipient_lookback_days),
)
```

A `last_login` of `NULL` (user has never logged in) excludes them — that's the desired behaviour for stale seed accounts and ex-employees.

The lookback is a setting rather than a hard constant because:
- A small nursery with one weekend manager who only logs in twice a month would lose notifications at 30d — they can crank it up.
- A high-turnover operation might want 7d to keep the noise down.

A value of `0` SHALL mean "no lookback filter" — preserves the pre-change behaviour for operators who explicitly want it.

## Impact

- New `NurserySetting.notification_recipient_lookback_days` field (`PositiveIntegerField`, default `30`).
- One-line migration.
- Recipient query in `notifications/services.py` gets a single new filter clause.
- New test in `notifications/tests/test_services.py` covering: included if recently logged in, excluded if not, included regardless when lookback is `0`, excluded if `last_login` is `NULL`.
- One new scenario in the live spec.

## Out of scope

- Adding a sliding scale or per-kind lookback. One uniform value is enough for v1.
- Auto-deactivating users with stale logins. That's an admin / HR concern; we just stop spamming them.
- Frontend Settings UI for the new field. The existing `/settings` form already exposes every `NurserySetting` field that the serializer surfaces, so adding the field there is a one-line input addition; that lands together with the implementation, no separate change needed.
