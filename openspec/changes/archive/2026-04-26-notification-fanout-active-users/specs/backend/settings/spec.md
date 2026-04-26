# MODIFIED: Backend / Settings

## ADDED Requirements

### Requirement: `NurserySetting.notification_recipient_lookback_days` SHALL gate the cron's recipient set

The singleton `NurserySetting` model SHALL expose a `notification_recipient_lookback_days` field — a `PositiveIntegerField` with `default = 30`. The notification cron SHALL only fan out events to users whose `last_login >= now - timedelta(days=N)` (where `N` is the field's value).

A value of `0` SHALL disable the lookback filter — recipients fall back to every active user, mirroring the pre-change behaviour. The field SHALL be exposed under the existing `/api/settings/` endpoints (admin-only writes, public read).

#### Scenario: Default value is 30

- GIVEN a fresh database
- WHEN `NurserySetting.load()` runs for the first time
- THEN `notification_recipient_lookback_days` SHALL equal `30`

#### Scenario: Operator widens the lookback

- GIVEN an admin opens Settings
- WHEN they change the lookback to `90` and save
- THEN `NurserySetting.notification_recipient_lookback_days` SHALL equal `90`
- AND the next cron run SHALL include users whose `last_login` is between 30 and 90 days ago
