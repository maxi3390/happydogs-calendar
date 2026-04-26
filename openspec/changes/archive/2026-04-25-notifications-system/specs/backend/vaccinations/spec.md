# MODIFIED: Backend / Vaccinations

## ADDED Requirements

### Requirement: VaccinationType SHALL carry a per-type `due_after_days` cadence

`VaccinationType` SHALL gain a `due_after_days` field — a `PositiveIntegerField` (default `365`) representing how many days after a vaccination of that type before the next one is considered due. The value is consulted by the notification system's `generate_notifications` command to decide when to fire `vaccination_due` notifications.

A value of `0` SHALL mean "non-recurring" — vaccinations of that type SHALL never produce a `vaccination_due` notification regardless of how old they are. This is the explicit opt-out for one-off vaccinations administered at intake.

The field SHALL be exposed in the existing `VaccinationType` REST endpoints (read on list / detail, write on create / update) and editable via the Settings UI.

#### Scenario: Default cadence is 365 days

- GIVEN a fresh deployment with the seeded vaccination types
- WHEN an operator inspects them
- THEN every type's `due_after_days` SHALL be `365`

#### Scenario: Per-type override

- GIVEN an operator sets the rabies vaccination type's `due_after_days` to `1095` (3 years)
- AND a pet has a rabies vaccination dated 366 days ago
- WHEN the notification cron runs
- THEN no `vaccination_due` notification SHALL fire for that pet's rabies record (the per-type cadence overrides the default)

#### Scenario: Non-recurring vaccination

- GIVEN a vaccination type's `due_after_days` is `0`
- AND a pet has a vaccination of that type dated several years ago
- WHEN the notification cron runs
- THEN no `vaccination_due` notification SHALL fire for that pet's vaccination, ever
