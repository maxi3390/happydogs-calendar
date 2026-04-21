# Delta for Backend Vets

This capability is introduced by this change. All requirements below are ADDED.

## ADDED Requirements

### Requirement: Vet Model Structure

The system SHALL provide a `Vet` model with required `name` (≤150), optional `phone`, `email`, `notes`, and audit timestamps. It SHALL inherit the `Address` abstract mixin so vet records carry the same `street`, `city`, `state`, `province`, `country` fields that `Owner` exposes, all of which SHALL remain optional.

#### Scenario: Minimal creation

- GIVEN a request to create a vet with only a `name`
- WHEN the request is processed
- THEN the record SHALL be persisted and every other field SHALL default to empty / null

#### Scenario: Full round-trip

- GIVEN a vet is created with every address and contact field populated
- WHEN the record is retrieved
- THEN every value SHALL match what was submitted

### Requirement: Vet REST API

The resource SHALL be registered at `/api/vets/` with the standard DRF list / retrieve / create / update / delete verbs, all gated by `IsAuthenticated`.

#### Scenario: Authenticated list

- WHEN an authenticated client issues `GET /api/vets/`
- THEN the response SHALL be a 200 JSON array of vet records

#### Scenario: Unauthenticated list is rejected

- WHEN an unauthenticated client issues `GET /api/vets/`
- THEN the response SHALL indicate authentication is required

### Requirement: FK Behavior On Deletion

Deleting a vet SHALL null every owner `primary_vet` / `emergency_vet` and every pet `vet_override` that pointed at it (`on_delete=SET_NULL`).

#### Scenario: Cascading nulls propagate but records survive

- GIVEN an owner with `primary_vet` set and a pet with `vet_override` set, both pointing at the same vet
- WHEN the vet is deleted
- THEN the owner and pet SHALL still exist
- AND their respective vet references SHALL be `null`
