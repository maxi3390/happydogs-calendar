# Proposal — seed vets

## Intent

Extend `make seed-example-data` to cover the `Vet` domain that landed after the initial seed was written. Without this update the seed fixture no longer represents the full data model: `Vet` rows are missing and the new `Owner.primary_vet` / `Owner.emergency_vet` / `Pet.vet_override` FKs are silently left null.

## Scope

### In scope

- Extend `backend/pets/management/commands/seed_example_data.py` to create 5 `Vet` rows with realistic, distinct profiles (general clinic, exotic specialist, emergency clinic, feline practice, mobile vet).
- Wire each seeded owner to a `primary_vet` and, where it makes sense, an `emergency_vet`. Use the full Address mixin fields on the vets so the UI's address cards have something to render.
- Wire two seeded pets to a `vet_override` that differs from their owner's `primary_vet` so the `effective_vet` resolver is exercised end-to-end.
- Preserve idempotency: re-running the command SHALL still report every record as `unchanged` on the second pass.
- Extend `--reset` to also delete seed-owned vets before recreating them.
- Update the baseline `openspec/specs/tooling/seed/spec.md` so the row-count contract now includes vets and the natural-key table includes the Vet entity.
- Update the tests (`backend/pets/tests/test_seed_example_data.py`) so `EXPECTED_COUNTS` and `_seed_counts()` include the vet counts, and add assertions for the new FKs.

### Out of scope

- Any change to the UI. The `vet-frontend` branch (in flight separately) already renders these relations once they exist in the DB.
- Rewriting the dataset. We only add: names, addresses, and FK wiring. The existing 8 owners / 12 pets / etc. stay identical apart from the two new FK columns.
- Introducing a `VetListItem` backend serializer or a `/vets/dropdown/` endpoint. The seed command talks directly to the ORM.

## Approach

1. Add a `SEED_VETS` list mirroring the structure of `SEED_OWNERS` (name + address + contact). 5 vets is enough to give every owner a primary and some owners an emergency, and to pick two for pet overrides.
2. Store the vet linkage on owners and pets by **name** (not id) in the seed dataset:
   - `SEED_OWNERS[i]['primary_vet_name']` / `emergency_vet_name` → resolved to a `Vet` instance via a `vets_by_name` dict built after vet seeding.
   - `SEED_PETS[i]['vet_override_name']` → resolved the same way.
3. Update `_seed_owners` and `_seed_pets` to peel off the `_name` fields, resolve them into FK objects, and assign them on the model instance. Follow the existing "check-then-update" pattern so idempotent runs stay idempotent.
4. Update `_reset` to delete seed-owned vets (natural key: the set of names in `SEED_VETS`) after the cascading pet/owner rows have been deleted.
5. Update the summary printer to include a `vets` row.
