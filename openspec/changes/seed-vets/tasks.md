# Tasks

## 1. Command
- [x] 1.1 Add `SEED_VETS` (list of 5 vet dicts with name, phone, email, full address, notes) to `backend/pets/management/commands/seed_example_data.py`.
- [x] 1.2 Add `primary_vet_name` + optional `emergency_vet_name` to each entry in `SEED_OWNERS`.
- [x] 1.3 Add optional `vet_override_name` to the relevant entries in `SEED_PETS` (Bugs, Perico).
- [x] 1.4 Add a `_seed_vets` step that runs right after vaccination types and returns a `dict[str, Vet]` keyed by name.
- [x] 1.5 Update `_seed_owners` to accept `vets_by_name`, resolve the vet FKs, and assign them idempotently on create/update.
- [x] 1.6 Update `_seed_pets` to accept `vets_by_name` and resolve `vet_override` idempotently.
- [x] 1.7 Extend `_reset` to delete seed-owned vets (matched by name) after the pet/owner cleanup.
- [x] 1.8 Add a `vets` row to `_Summary` + `_print_summary`.

## 2. Tests
- [x] 2.1 Add `'vets': len(SEED_VETS)` to `EXPECTED_COUNTS`.
- [x] 2.2 Extend `_seed_counts()` to include vets.
- [x] 2.3 New test: seeded owners carry the expected `primary_vet` and (where applicable) `emergency_vet` FKs.
- [x] 2.4 New test: Bugs and Perico carry the expected `vet_override` FK.
- [x] 2.5 Existing tests still pass (`EmptyDB`, idempotent re-run, `--reset`, production guard).

## 3. Spec
- [x] 3.1 Write `openspec/changes/seed-vets/specs/tooling/seed/spec.md` as a MODIFIED delta covering the updated counts and new FK requirement.
- [x] 3.2 Apply the same change to the baseline `openspec/specs/tooling/seed/spec.md` so the contract stays in sync on archival.

## 4. Verification
- [x] 4.1 `docker compose exec -T backend python manage.py test --settings=nursery.test_settings --keepdb` — all tests green.
- [x] 4.2 `make seed-example-data` (first run on a DB already seeded with the old fixture): vets show `created=5`, owners show 8 records `updated` (primary_vet wiring), pets show 2 records `updated` (vet_override wiring).
- [x] 4.3 `make seed-example-data` (second run): every entity reports `unchanged` for all rows.
- [x] 4.4 `SEED_ARGS=--reset make seed-example-data`: everything deleted then recreated, counts match the new expectations.
- [x] 4.5 `python3 -c "import json; json.load(open('backend/translations/en.json'))"` and es.json parse clean (no translation files touched, but sanity check).
