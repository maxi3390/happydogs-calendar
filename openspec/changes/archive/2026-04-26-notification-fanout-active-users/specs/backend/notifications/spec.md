# MODIFIED: Backend / Notifications

## MODIFIED Requirements

### Requirement: `generate_notifications` management command SHALL produce per-user rows for every relevant event

When the `notifications` feature flag is enabled, the command SHALL, **for every recipient user that matches the lookback filter** (see below), materialise notifications for the events listed below.

The recipient set SHALL be:

```
User.objects.filter(is_active=True)
            .filter(last_login__gte=now - timedelta(days=lookback))
```

…where `lookback = NurserySetting.notification_recipient_lookback_days`. When `lookback = 0`, the second filter is dropped and the recipient set reverts to every active user. Users with `last_login IS NULL` are excluded from the lookback window (they have never authenticated and would not see the notification anyway).

(Event-by-event rules, retention semantics, and idempotency requirements remain as previously specified.)

#### Scenario: User who logged in 5 days ago receives notifications

- GIVEN `notification_recipient_lookback_days = 30`
- AND user Alice has `last_login = today - 5 days` and `is_active = True`
- WHEN the management command runs
- THEN Alice SHALL receive a row for every event the cron fires today

#### Scenario: User who logged in 31 days ago does NOT receive notifications

- GIVEN `notification_recipient_lookback_days = 30`
- AND user Bob has `last_login = today - 31 days` and `is_active = True`
- WHEN the management command runs
- THEN Bob SHALL NOT receive any notifications
- AND no email SHALL be sent to Bob

#### Scenario: User who has never logged in is excluded

- GIVEN `notification_recipient_lookback_days = 30`
- AND user Carol has `last_login = NULL` (just-created account, never authenticated)
- WHEN the management command runs
- THEN Carol SHALL NOT receive any notifications

#### Scenario: Lookback of 0 includes everyone

- GIVEN `notification_recipient_lookback_days = 0`
- AND user Dave has `last_login = today - 365 days` and `is_active = True`
- WHEN the management command runs
- THEN Dave SHALL receive notifications (the lookback is disabled)
