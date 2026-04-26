# MODIFIED: Backend / Settings

## ADDED Requirements

### Requirement: NurserySetting SHALL expose notification configuration fields

The singleton `NurserySetting` model SHALL gain the following fields, all editable through the existing settings endpoints:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `notifications_run_time` | `TimeField` | `07:00` | Time of day the daily notifications cron generates and sends notifications. |
| `deworming_default_due_days` | `PositiveIntegerField` | `90` | Days after a deworming treatment before it's considered due for a follow-up. Used for both internal and external. |
| `notifications_vaccination_enabled` | `BooleanField` | `True` | Per-kind toggle: vaccination-due notifications. |
| `notifications_arrivals_enabled` | `BooleanField` | `True` | Per-kind toggle: pet-arriving-today / -tomorrow notifications. |
| `notifications_egress_enabled` | `BooleanField` | `True` | Per-kind toggle: pet-egress-today / -tomorrow notifications. |
| `notifications_birthdays_enabled` | `BooleanField` | `True` | Per-kind toggle: pet birthday notifications. |
| `notifications_deworming_enabled` | `BooleanField` | `True` | Per-kind toggle: deworming-due notifications (both sides). |

The per-kind booleans default to `True` so that flipping the master `notifications` feature flag on activates every kind unless the operator explicitly disabled one.

#### Scenario: Defaults on a fresh deployment

- GIVEN a fresh database
- WHEN `NurserySetting.load()` runs for the first time
- THEN every notification field SHALL hold its documented default value

#### Scenario: Operator changes a per-kind toggle

- GIVEN an operator opens Settings
- WHEN they uncheck "Birthday notifications" and save
- THEN `NurserySetting.notifications_birthdays_enabled` SHALL be `False`
- AND the next cron run SHALL skip birthday notifications
- AND every other kind SHALL still fire if its toggle remains True
