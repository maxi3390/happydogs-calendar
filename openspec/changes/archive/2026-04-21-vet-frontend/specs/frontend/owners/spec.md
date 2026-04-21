# MODIFIED: Frontend / Owners

## ADDED Requirements

### Requirement: Owner Vet Dropdowns

The Owner form SHALL surface two optional dropdowns — Primary Vet and Emergency Vet — populated from `/api/vets/` and backed by the `Owner.primary_vet` and `Owner.emergency_vet` FKs.

#### Scenario: Selecting and persisting vet references

- GIVEN the operator is creating or editing an owner
- WHEN the operator selects a vet from the Primary Vet dropdown and optionally a different vet from the Emergency Vet dropdown and saves the form
- THEN the POST / PATCH payload SHALL include `primary_vet` and `emergency_vet` as numeric FK ids (or `null` when cleared)
- AND the updated owner record SHALL round-trip the selected values on subsequent loads

#### Scenario: Clearing a vet reference

- GIVEN an owner has a `primary_vet` or `emergency_vet` set
- WHEN the operator selects the blank option and saves
- THEN the field SHALL be persisted as `null` server-side

#### Scenario: Empty vet list

- GIVEN no vets exist yet
- WHEN the operator opens the owner form
- THEN the dropdowns SHALL render with a hint pointing the operator to the `/vets` page
