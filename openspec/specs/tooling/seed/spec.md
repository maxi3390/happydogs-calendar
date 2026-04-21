# Tooling: Example Data Seeding Specification

## Purpose

Give operators a one-command way to populate a development database with a deterministic, representative dataset. The goal is to shorten "blank DB" → "I can explore the app" from many manual steps to a single `make` target, while making the exact row counts and names predictable enough to be referenced in docs, screenshots, and tests.

## Requirements

### Requirement: `make seed-example-data` Populates A Deterministic Demo Dataset

`make seed-example-data` SHALL invoke the Django management command `seed_example_data` inside the `backend` container and populate an empty or partially-empty development database with a small, curated fixture covering every core entity (users, vaccination types, owners, pets, vaccinations, medical notes, schedules).

The dataset SHALL be deterministic: the same list of names, emails, and counts on every run of the same code revision. Random generators (e.g. Faker) SHALL NOT be used.

The command SHALL wrap all writes in a single database transaction so that a mid-run failure leaves the database untouched.

#### Scenario: Seeding an empty database

- GIVEN a database with only the default admin user
- WHEN the operator runs `make seed-example-data`
- THEN the command SHALL exit 0
- AND the database SHALL contain exactly 2 additional `User` rows, 5 `VaccinationType` rows, 8 `Owner` rows, 12 `Pet` rows, 10 `Vaccination` rows, 4 `MedicalNote` rows, and 10 `Schedule` rows introduced by the seed
- AND the final stdout line SHALL be a summary with per-entity created/updated/unchanged counts

### Requirement: The Seed Command Is Idempotent

Running `make seed-example-data` a second time with no flags SHALL NOT create duplicate rows. The command SHALL look up existing rows by stable natural keys and SHALL use `get_or_create` / `update_or_create` semantics.

Natural keys by entity:

- `User` → `email`
- `VaccinationType` → `name`
- `Owner` → `email`
- `Pet` → `(owner, name)`
- `Vaccination` → `(pet, vax_type, date)`
- `MedicalNote` → `(pet, title)`
- `Schedule` → `(pet, start_date, start_time)`

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
