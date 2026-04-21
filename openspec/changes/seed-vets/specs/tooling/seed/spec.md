# MODIFIED: Tooling / Seed example data

## MODIFIED Requirements

### Requirement: `make seed-example-data` Populates A Deterministic Demo Dataset

`make seed-example-data` SHALL invoke the Django management command `seed_example_data` inside the `backend` container and populate an empty or partially-empty development database with a small, curated fixture covering every core entity (users, vaccination types, vets, owners, pets, vaccinations, medical notes, schedules).

The dataset SHALL be deterministic: the same list of names, emails, and counts on every run of the same code revision. Random generators (e.g. Faker) SHALL NOT be used.

The command SHALL wrap all writes in a single database transaction so that a mid-run failure leaves the database untouched.

#### Scenario: Seeding an empty database

- GIVEN a database with only the default admin user
- WHEN the operator runs `make seed-example-data`
- THEN the command SHALL exit 0
- AND the database SHALL contain exactly 2 additional `User` rows, 5 `VaccinationType` rows, 5 `Vet` rows, 8 `Owner` rows, 12 `Pet` rows, 10 `Vaccination` rows, 4 `MedicalNote` rows, and 10 `Schedule` rows introduced by the seed
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

## ADDED Requirements

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
