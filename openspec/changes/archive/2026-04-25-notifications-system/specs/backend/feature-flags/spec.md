# MODIFIED: Backend / Feature Flags

## ADDED Requirements

### Requirement: `notifications` feature flag SHALL be seeded disabled

The system SHALL seed a new `FeatureFlag` row with `key = "notifications"`, `enabled = False`. The flag is the master switch for the notifications system: when disabled, the daily cron is a no-op, the bell icon is not rendered in the navigation, and the `/notifications` page returns 404.

The seed migration SHALL be idempotent (re-running `migrate` after the flag has been flipped in production MUST NOT reset it). The reverse migration SHALL be a no-op so reverting the migration never silently flips the flag off in environments that depend on it.

The `feature_flags.tests.SEEDED_KEYS` set SHALL be extended to include `notifications`, and `notifications` SHALL be listed under `DISABLED_BY_DEFAULT`.

#### Scenario: Migration creates the row when missing

- GIVEN a database without the `notifications` flag row
- WHEN `migrate` runs
- THEN a `FeatureFlag` row with `key = "notifications"` SHALL exist with `enabled = False`

#### Scenario: Migration leaves toggled rows alone

- GIVEN the `notifications` flag exists with `enabled = True`
- WHEN `migrate` runs again
- THEN the flag's `enabled` value SHALL remain `True`
