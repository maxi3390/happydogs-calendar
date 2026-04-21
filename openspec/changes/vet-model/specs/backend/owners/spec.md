# Delta for Backend Owners

## ADDED Requirements

### Requirement: Owner Vet Relations

Each `Owner` SHALL expose two nullable foreign keys pointing at the `Vet` model (defined in the `backend/vets` capability): `primary_vet` and `emergency_vet`. Both fields SHALL use `on_delete=SET_NULL` so deleting a referenced vet clears the owner's FK without destroying the owner. Both fields SHALL be optional and writable through the owner REST API on create and update.

#### Scenario: Creating an owner without vet references

- GIVEN a request to create an owner without specifying `primary_vet` or `emergency_vet`
- WHEN the request is processed
- THEN the owner SHALL be created
- AND both vet fields SHALL be `null` in the persisted record

#### Scenario: Assigning primary and emergency vets at create time

- GIVEN two existing vet records
- WHEN an owner is created with `primary_vet` and `emergency_vet` referencing those two vets
- THEN the persisted owner SHALL carry both FKs
- AND a subsequent retrieve SHALL return them unchanged

#### Scenario: Deleting a referenced vet nulls owner references

- GIVEN an owner whose `primary_vet` or `emergency_vet` points at a specific vet
- WHEN that vet is deleted
- THEN the owner SHALL still exist
- AND the owner's references to the deleted vet SHALL be `null`
