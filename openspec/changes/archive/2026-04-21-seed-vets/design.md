# Design — seed vets

## Dataset

Five clinics give the fixture enough variety to exercise both FKs on most owners and leave two pets with an override that differs from their owner's primary. Names are hand-picked so docs and screenshots can reference specific clinics.

| Vet name                       | Speciality lean              | City          |
|--------------------------------|------------------------------|---------------|
| General Vet Clinic             | General practice             | Palermo       |
| Exotic Animals Specialist      | Birds, rabbits, reptiles     | Belgrano      |
| Emergency Vet Hospital 24/7    | After-hours emergencies      | Recoleta      |
| Feline Health Practice         | Cats-only practice           | Palermo       |
| Mobile Home Vet                | House calls                  | Flores        |

### Owner wiring

| Owner                          | Primary vet                  | Emergency vet                    |
|--------------------------------|------------------------------|----------------------------------|
| Ana García (cat)               | Feline Health Practice       | —                                |
| Luis Fernández (two dogs)      | General Vet Clinic           | Emergency Vet Hospital 24/7      |
| María López (dog + rabbit)     | General Vet Clinic           | Exotic Animals Specialist        |
| José Martínez (aggressive dog) | General Vet Clinic           | Emergency Vet Hospital 24/7      |
| Laura Rodríguez (anxious dog)  | Mobile Home Vet              | —                                |
| Pedro Sánchez (two cats)       | Feline Health Practice       | —                                |
| Carolina Ruiz (small dog)      | General Vet Clinic           | —                                |
| Diego Torres (bird + dog)      | Exotic Animals Specialist    | Emergency Vet Hospital 24/7      |

### Pet overrides

Two pets get a `vet_override` so the `effective_vet` resolver is exercised end-to-end:

| Pet                             | Owner's primary        | Override (different)        | Why                                            |
|---------------------------------|------------------------|-----------------------------|------------------------------------------------|
| Bugs (rabbit, María's)          | General Vet Clinic     | Exotic Animals Specialist   | Rabbits need an exotic vet                     |
| Perico (parakeet, Diego's)      | Exotic Animals Spec.   | General Vet Clinic          | Intentionally "switched" pair so the override direction is visible in both the "specialist → general" and the "general → specialist" senses |

## Natural keys

| Entity | Natural key       |
|--------|-------------------|
| `Vet`  | `name` (unique for the seed dataset) |

`Owner.primary_vet`, `Owner.emergency_vet`, and `Pet.vet_override` are not themselves natural keys — they are resolved from the corresponding vet's `name` at seed time. The existing natural key for owners / pets stays the same (`email` for owners, `(owner, name)` for pets).

## Data-flow changes

Creation order gets one new step up front:

1. Users
2. Vaccination types
3. **Vets**  ← new
4. Owners (with resolved `primary_vet` / `emergency_vet`)
5. Pets (with resolved `vet_override`)
6. Vaccinations
7. Medical notes
8. Schedules

For `--reset`, deletion order is reversed: schedules → vaccinations → medical notes → pets → owners → **vets** → vaccination types → users. Vets must go after pets and owners so that their FK rows with `on_delete=SET_NULL` are cleaned first (no orphan FKs).

## Idempotency semantics

- Re-running the seed with unchanged source data SHALL NOT re-assign vet FKs whose target is already correct (avoid gratuitous `UPDATE`s). The existing "check then set" pattern on field mutation applies to the `*_vet_id` columns.
- If a vet has been manually renamed out of band (breaking the natural key), the next run SHALL create a new vet with the canonical name and rewire owner / pet FKs to the new one. The manually renamed vet is preserved.
- `--reset` SHALL leave non-seed vets alone. The delete filter is `name__in=[every seed vet name]`.

## Summary printer

One extra row between "vaccination types" and "owners":

```
vets               created=5  updated=0  unchanged=0  deleted=0
```

## Rejected alternatives

- **Seed vets inside `_seed_owners`** (one-shot creation while wiring owners). Mixes two concerns and makes `--reset` ordering fragile. Dedicated `_seed_vets` step keeps the code boring.
- **Use auto-incrementing vet ids in `SEED_OWNERS`** (e.g. `primary_vet: 1`). Brittle across resets, doesn't survive re-seeding into an existing DB with pre-existing vet ids. Name-based resolution is stable.
- **Skip `effective_vet` coverage in the fixture** (no pet overrides). Would leave the most interesting Vet invariant untested on a fresh dev DB. Two overrides is the minimum to show both directions (specialist → general and general → specialist).
- **Extend the summary row for owners / pets to report per-FK change counts** (e.g. "primary_vet created=5"). Wouldn't match the uniform `created/updated/unchanged` shape of every other entity. Keep the summary schema.
