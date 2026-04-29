# Tasks

## Setup
- [x] Create branch `feat/seed-overlap-multiday-and-overrides`
- [x] Scaffold OpenSpec change folder

## Seed command (`backend/pets/management/commands/seed_example_data.py`)
- [x] Add 7 new schedules to `_seed_schedules()` (split shift, compatible multi-day overlap pair, multi-day + override pair, custom-rule overlap pair)
- [x] Add `SEED_PET_INCOMPATIBILITIES` constant (Milo ↔ Cleo) + `_seed_pet_incompatibilities` method (idempotent under `unique_together(pet1, pet2)`)
- [x] Add `SEED_NURSERY_SETTINGS` constant (`daily_booking_limit = 6`) + `_seed_nursery_setting` method (reconciles seed-owned fields only)
- [x] Wire both new methods into `handle()`
- [x] Extend `_reset` to count `PetIncompatibility` rows attached to seed pets (both FK columns)
- [x] Extend `_Summary` dataclass + `_print_summary` with `pet_incompatibilities` and `nursery_settings` rows

## Tests (`backend/pets/tests/test_seed_example_data.py`)
- [x] `SeedExampleDataScheduleScenariosTests` — 5 tests covering each new schedule shape (multi-day, multi-day overlap pair, same-pet split shift, override conflict, custom-rule conflict)
- [x] `SeedExampleDataPetIncompatibilityTests` — 4 tests (count, pet pair lookup, idempotency, --reset round-trip)
- [x] `SeedExampleDataNurserySettingsTests` — 3 tests (initial value, drift recovery, non-seed-field preservation)

## Live spec (`openspec/specs/tooling/seed/spec.md`)
- [x] Bump exact-count scenario (10 → 17 Schedule rows + 1 PetIncompatibility row + nursery singleton config)
- [x] Add `PetIncompatibility` and `NurserySetting` natural-keys list entries
- [x] New Requirement: "The Seed Exercises Every Schedule Shape The Calendar Renders" with 4 scenarios
- [x] New Requirement: "The Seed Configures The Nursery Singleton" with 3 scenarios

## Verification
- [x] `make test-backend`: 521 passing (was 509; +12 new)
- [x] Existing seed tests (24) still pass — `EXPECTED_COUNTS` derives from `len(seed_module._seed_schedules())` and adapts automatically

## Commit
- [x] Single commit on `feat/seed-overlap-multiday-and-overrides`
- [x] Merged into master (operator approval received post-review)
