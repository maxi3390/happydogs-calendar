# MODIFIED: Frontend / Pets

## ADDED Requirements

### Requirement: Pet Vet Override Dropdown

The Pet form SHALL surface an optional `vet_override` dropdown populated from `/api/vets/` and backed by the `Pet.vet_override` FK. A short hint SHALL explain that the field is optional and that the effective vet resolves to the per-pet override first, then the owner's primary vet, then nothing.

#### Scenario: Setting an override

- GIVEN the operator is creating or editing a pet
- WHEN the operator selects a vet from the override dropdown and saves
- THEN the POST / PATCH payload SHALL include `vet_override` as a numeric FK id

#### Scenario: Clearing an override

- GIVEN a pet has a `vet_override` set
- WHEN the operator selects the blank option and saves
- THEN the field SHALL be persisted as `null` server-side
- AND the pet's effective vet SHALL fall back to the owner's `primary_vet` (as defined in the backend spec)

#### Scenario: Hint wording

- GIVEN the pet form is rendered
- THEN the hint next to the `vet_override` field SHALL mention the resolution order (override → owner primary → none)
