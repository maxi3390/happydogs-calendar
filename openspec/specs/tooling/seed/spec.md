# Tooling: Example Data Seeding Specification

## Purpose

Give operators a one-command way to populate a development database with a deterministic, representative dataset. The goal is to shorten "blank DB" → "I can explore the app" from many manual steps to a single `make` target, while making the exact row counts and names predictable enough to be referenced in docs, screenshots, and tests.

## Requirements

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

#### Scenario: Re-running is a no-op in row count

- GIVEN `make seed-example-data` has completed successfully once
- WHEN the operator runs `make seed-example-data` a second time
- THEN the row counts for each seeded entity SHALL be identical to the first run
- AND the summary SHALL report every seed record as unchanged or updated (never created)

#### Scenario: Seed does not clobber unrelated rows

- GIVEN the database contains owners, pets, and schedules created out-of-band (e.g. by a developer using the UI) whose natural keys do not match the seed dataset
- WHEN the operator runs `make seed-example-data`
- THEN only the seed-owned rows SHALL be created or updated
- AND out-of-band rows SHALL remain untouched

### Requirement: The Seed Command Refuses To Run In Production By Default

When `settings.DEBUG` is False, the command SHALL refuse to write to the database unless the operator passes `--allow-production`. The refusal SHALL happen before any write.

#### Scenario: Production run without the flag

- GIVEN `DEBUG=False`
- WHEN the operator runs `manage.py seed_example_data` without `--allow-production`
- THEN the command SHALL exit with a non-zero status
- AND the database SHALL be unchanged
- AND the error message SHALL mention the `--allow-production` flag

#### Scenario: Production run with explicit opt-in

- GIVEN `DEBUG=False`
- WHEN the operator runs `manage.py seed_example_data --allow-production`
- THEN the command SHALL proceed with the same idempotent semantics as in development

### Requirement: The `--reset` Flag Scopes Deletion To Seed-Owned Rows

When invoked with `--reset`, the command SHALL first delete all rows it would otherwise create, matched by the same natural keys, and then re-create them. Rows with keys outside the seed dataset (e.g. the default admin user, developer-created owners, other pets) SHALL be left intact.

#### Scenario: Re-seed after manual tampering

- GIVEN the seed has been run and an operator has since edited a seeded pet's `temperament` or deleted a seeded schedule
- WHEN the operator runs `make seed-example-data SEED_ARGS=--reset`
- THEN the seeded rows SHALL be deleted and re-created with the canonical values
- AND non-seed rows SHALL be unchanged

### Requirement: `make seed-example-data` Forwards Optional Arguments

The Makefile target SHALL support an optional `SEED_ARGS` variable that is forwarded verbatim to the management command so operators can combine flags without editing the Makefile.

#### Scenario: Forwarding `--reset`

- WHEN the operator runs `SEED_ARGS=--reset make seed-example-data`
- THEN the `--reset` flag SHALL reach the `seed_example_data` management command

### Requirement: The Seed Wires Vet Relations On Owners And Pets

The command SHALL populate the `Owner.primary_vet`, `Owner.emergency_vet`, and `Pet.vet_override` foreign keys using the seeded vets. The wiring SHALL resolve vets by name so the dataset is stable across reseeds.

At minimum, every seeded owner SHALL have a `primary_vet` assigned, at least four seeded owners SHALL also have an `emergency_vet` assigned, and at least two seeded pets SHALL have a `vet_override` that differs from their owner's `primary_vet`.

#### Scenario: Owner vet wiring

- GIVEN the seed has completed on an empty DB
- WHEN the database is inspected
- THEN every seed-owned `Owner` row SHALL have a non-null `primary_vet_id`
- AND at least four seed-owned owners SHALL have a non-null `emergency_vet_id`

#### Scenario: Pet vet override

- GIVEN the seed has completed on an empty DB
- WHEN the database is inspected
- THEN at least two seed-owned `Pet` rows SHALL have a non-null `vet_override_id`
- AND for each such pet, `vet_override_id` SHALL NOT equal the owner's `primary_vet_id`

### Requirement: `--reset` Removes Seed-Owned Vets

When invoked with `--reset`, the command SHALL additionally delete every seed-owned `Vet` row (matched by `name`) after the dependent owner / pet rows have been cleaned. Non-seed vets created out of band SHALL be untouched.

#### Scenario: Reset removes seeded vets

- GIVEN the seed has been run and 5 seeded vets exist
- WHEN the operator runs `make seed-example-data SEED_ARGS=--reset`
- THEN the 5 seeded vets SHALL be deleted and re-created with the canonical data
- AND the summary SHALL show `deleted=5` on the `vets` row

### Requirement: The Seed Provisions Notification-System Demo Data

The command SHALL populate fixtures that exercise the notifications system end-to-end on the day of seed:

- At least one seeded pet's `birth_date` SHALL be set to today's month-day (in a year matching the pet's age) so the next cron run produces a `pet_birthday` notification.
- At least one seeded pet SHALL have `last_internal_deworming_date` set to a date older than `NurserySetting.deworming_default_due_days` so the next cron run produces a `deworming_internal_due` notification.
- At least one seeded pet SHALL have `last_external_deworming_date` set to a date older than `NurserySetting.deworming_default_due_days` so the next cron run produces a `deworming_external_due` notification.
- At least one seeded vaccination SHALL be old enough that the matching `VaccinationType.due_after_days` makes it due as of today.
- The `NotificationTemplate` rows for both supported scopes (`treatment_due`, `pet_birthday`) SHALL be seeded with non-empty Spanish operator overrides so the forward-to-owner buttons render demo content out of the box.
- A `NotificationPreference` row SHALL be seeded for every seeded staff user. The seed dataset SHALL include at least one user with `email_enabled = True` and at least one with `email_enabled = False` so the per-user opt-out is exercised.

When the master `notifications` feature flag is enabled at seed time, the command SHALL additionally invoke the notification-generation service for `today` so `Notification` rows are materialised immediately. When the flag is disabled, no `Notification` rows SHALL be created (the operator runs `make notifications-run` after enabling the flag).

#### Scenario: Notifications seed with the master flag off

- GIVEN the `notifications` feature flag is `enabled = False`
- WHEN the operator runs `make seed-example-data`
- THEN the seeded `NotificationTemplate` and `NotificationPreference` rows SHALL be created
- AND zero `Notification` rows SHALL be created
- AND running `make notifications-run` after flipping the flag on SHALL produce a non-empty set of notifications driven by the seeded fixture

#### Scenario: Notifications seed with the master flag on

- GIVEN the `notifications` feature flag is `enabled = True`
- WHEN the operator runs `make seed-example-data`
- THEN the seed SHALL invoke the notification-generation service for today
- AND `Notification` rows SHALL exist for at least one of each kind that the seeded fixture is known to fire (`pet_birthday`, `deworming_internal_due`, `deworming_external_due`, `vaccination_due`, `pet_arriving_today`)

#### Scenario: `--reset` cleans up seeded notifications data

- GIVEN the seed has been run and seeded notification templates / preferences exist
- WHEN the operator runs `make seed-example-data SEED_ARGS=--reset`
- THEN the seeded `NotificationTemplate` rows SHALL be deleted and re-created with their canonical Spanish copy
- AND the seeded `NotificationPreference` rows SHALL be deleted and re-created
- AND any `Notification` rows for seed-owned pets SHALL be deleted (other rows untouched)

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
