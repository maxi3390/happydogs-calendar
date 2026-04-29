# MODIFIED: Tooling / Seed Example Data

## MODIFIED Requirements

### Requirement: `make seed-example-data` Populates A Deterministic Demo Dataset

`make seed-example-data` SHALL invoke the Django management command `seed_example_data` inside the `backend` container and populate an empty or partially-empty development database with a small, curated fixture covering every core entity (users, vaccination types, vets, owners, pets, vaccinations, medical notes, schedules, custom pet-incompatibility rules, the nursery-settings singleton, notification templates, notification preferences).

The dataset SHALL be deterministic: the same list of names, emails, and counts on every run of the same code revision. Random generators (e.g. Faker) SHALL NOT be used.

The command SHALL wrap all writes in a single database transaction so that a mid-run failure leaves the database untouched.

#### Scenario: Seeding an empty database

- GIVEN a database with only the default admin user
- WHEN the operator runs `make seed-example-data`
- THEN the command SHALL exit 0
- AND the database SHALL contain exactly 2 additional `User` rows, 5 `VaccinationType` rows, 5 `Vet` rows, 8 `Owner` rows, 12 `Pet` rows, 10 `Vaccination` rows, 4 `MedicalNote` rows, 17 `Schedule` rows, 1 `PetIncompatibility` row, 2 `NotificationTemplate` rows, and 2 `NotificationPreference` rows introduced by the seed
- AND the `NurserySetting` singleton SHALL have `daily_booking_limit = 6`
- AND the final stdout line SHALL be a summary with per-entity created/updated/unchanged counts

### Requirement: The Seed Command Is Idempotent

Running `make seed-example-data` a second time with no flags SHALL NOT create duplicate rows. The command SHALL look up existing rows by stable natural keys and SHALL use `get_or_create` / `update_or_create` semantics.

Natural keys by entity:

- `User` → `email`
- `VaccinationType` → `name`
- `Vet` → `name`
- `Owner` → `email`
- `Pet` → `(owner, name)`
- `Vaccination` → `(pet, vax_type, date)`
- `MedicalNote` → `(pet, title)`
- `Schedule` → `(pet, start_date, start_time)`
- `PetIncompatibility` → `(pet1, pet2)` with `pet1_id < pet2_id`
- `NurserySetting` → singleton (`pk = 1`); seed-owned fields are reconciled, non-seed fields are left alone
- `NotificationTemplate` → `scope`
- `NotificationPreference` → `user`

## ADDED Requirements

### Requirement: The Seed Exercises Every Schedule Shape The Calendar Renders

The schedule fixture SHALL stage at least one example of each shape the calendar UI renders, so a freshly seeded database lights up every visual state operators encounter in production. Specifically:

- **Past (completed)** and **past (cancelled)** entries — exercise the historical-row rendering and the status-pill colour map.
- **Today, checked-in** — exercises the "currently in" indicator.
- **Same-day, multiple time slots, same pet** — at least one seeded pet SHALL hold two non-overlapping schedules whose `start_date == end_date == today`. Exercises the calendar's split-shift cell rendering.
- **Same-day, multiple pets, separate time slots** — at least one seeded day SHALL hold two schedules for different pets at non-overlapping times.
- **Same-day, multiple pets, identical time slot, no conflict** — at least one seeded day SHALL hold two schedules at the same time for compatible pets (no rule triggers).
- **Multi-day single-pet stay** — at least one seeded schedule SHALL have `end_date > start_date`.
- **Overlapping multi-day stays** — at least one pair of seeded schedules SHALL have overlapping `[start_date, end_date]` ranges with at least one of them multi-day.
- **Operator-override conflict, multi-day** — at least one seeded multi-day schedule SHALL overlap another seeded schedule whose pet is incompatible under one of the hardcoded rules in `Pet.is_compatible_with` (e.g. an aggressive-temperament overlap). The schedule MUST exist in the DB despite the warning, with `notes` describing the operator's mitigation.
- **Custom-rule operator override** — at least one seeded schedule pair SHALL trigger a custom `PetIncompatibility` reason (free-text) on `is_compatible_with`. The two schedules MUST overlap so the conflict-warning UI lights up.

#### Scenario: Same-pet split shift on `today`

- GIVEN a freshly seeded database
- WHEN the operator queries schedules for `today` for the seeded pet "Mía"
- THEN at least two rows SHALL be returned
- AND the first row's `end_time` SHALL be earlier than the second row's `start_time`

#### Scenario: Overlapping multi-day pair

- GIVEN a freshly seeded database
- WHEN the operator inspects the seeded schedules
- THEN at least one pair (A, B) SHALL exist where A's `[start_date, end_date]` covers B's `[start_date, end_date]`
- AND at least one of A or B SHALL be multi-day (`end_date > start_date`)

#### Scenario: Multi-day operator-override conflict

- GIVEN a freshly seeded database
- WHEN the operator picks the seeded multi-day schedule for the pet named "Bruno"
- AND queries `get_overlapping_schedules()` on it
- THEN the result SHALL include at least one schedule whose pet is incompatible with Bruno under one of the hardcoded rules
- AND the overlapping schedule SHALL be persisted with non-empty `notes` describing the operator's mitigation

#### Scenario: Custom-rule conflict surfaces the free-text reason

- GIVEN a freshly seeded database
- WHEN the operator queries `is_compatible_with` between Pedro Sánchez's "Milo" and "Cleo"
- THEN the call SHALL return `is_compatible = False`
- AND the reasons list SHALL include the canonical free-text reason from `SEED_PET_INCOMPATIBILITIES[0]['reason']`

### Requirement: The Seed Configures The Nursery Singleton

The command SHALL load the `NurserySetting` singleton (creating it on first run) and set `daily_booking_limit = 6` so the daily-limit indicator on the calendar surfaces with a non-trivial threshold. Other singleton fields (notification cron times, deworming cadence, recipient lookback) SHALL be left at the operator's existing values; the seed reconciles only the seed-owned subset.

#### Scenario: First seed sets the limit

- GIVEN a database with no `NurserySetting` row
- WHEN the operator runs `make seed-example-data`
- THEN `NurserySetting.load().daily_booking_limit` SHALL equal 6

#### Scenario: Re-seed restores canonical limit after drift

- GIVEN the seed has run and an operator has changed `daily_booking_limit` to 999
- WHEN the operator runs `make seed-example-data` again (no flags)
- THEN `NurserySetting.load().daily_booking_limit` SHALL be back to 6

#### Scenario: Re-seed preserves non-seed singleton fields

- GIVEN the seed has run and an operator has changed `deworming_default_due_days` to 42
- WHEN the operator runs `make seed-example-data` again (no flags)
- THEN `NurserySetting.load().deworming_default_due_days` SHALL still be 42 (the seed does not manage that field)
