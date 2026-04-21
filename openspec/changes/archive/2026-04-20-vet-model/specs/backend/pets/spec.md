# Delta for Backend Pets

## ADDED Requirements

### Requirement: Pet Vet Override

Each `Pet` SHALL expose a nullable `vet_override` foreign key pointing at the `Vet` model (defined in the `backend/vets` capability) with `on_delete=SET_NULL`. When set, it overrides the owner's `primary_vet` for this specific pet.

A Pet SHALL additionally expose an `effective_vet` read-only accessor that resolves, in order: `vet_override` if set, else `owner.primary_vet` if the pet has an owner with a primary vet, else `None`.

#### Scenario: Pet with no override falls back to owner's primary vet

- GIVEN a pet whose owner has `primary_vet` set
- AND the pet has `vet_override` unset
- WHEN code reads `pet.effective_vet`
- THEN it SHALL return the owner's `primary_vet`

#### Scenario: Pet with override wins over owner's primary

- GIVEN a pet with `vet_override` set
- AND the pet's owner also has a different `primary_vet` set
- WHEN code reads `pet.effective_vet`
- THEN it SHALL return `vet_override`

#### Scenario: Pet with no override and no owner primary returns None

- GIVEN a pet without `vet_override`
- AND whose owner has no `primary_vet` (or the pet has no owner)
- WHEN code reads `pet.effective_vet`
- THEN it SHALL return `None`

#### Scenario: Deleting the override vet nulls the field

- GIVEN a pet whose `vet_override` points at a specific vet
- WHEN that vet is deleted
- THEN the pet SHALL still exist
- AND `vet_override` SHALL be `null`
