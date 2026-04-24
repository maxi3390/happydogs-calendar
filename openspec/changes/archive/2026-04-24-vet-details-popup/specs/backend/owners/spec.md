# MODIFIED: Backend / Owners

## MODIFIED Requirements

### Requirement: Owner Serializer Payload

`OwnerSerializer` and `OwnerWithPetsSerializer` SHALL continue to include every field of the `Owner` model plus the existing `pet_count`, `profile_picture_url`, and (for `OwnerWithPetsSerializer`) `pets` projections. In addition, both serializers SHALL include two new read-only projections:

- `primary_vet_details` — a compact object (`id`, `name`, `phone`, `email`, `city`) sourced from the related `Vet` record via `source='primary_vet'`. `null` when the owner has no `primary_vet`.
- `emergency_vet_details` — same shape and semantics, sourced from `emergency_vet`.

The raw `primary_vet` / `emergency_vet` FK ids SHALL remain writable so clients can continue to create / update an owner by posting the vet id alone.

#### Scenario: Owner with both vets exposes nested details

- GIVEN an `Owner` whose `primary_vet` points at a `Vet` named "Happy Paws" and `emergency_vet` at "Nightline Vet"
- WHEN a client retrieves the owner via `GET /api/owners/<id>/`
- THEN the response body SHALL include `primary_vet_details` with `name = "Happy Paws"` and `emergency_vet_details` with `name = "Nightline Vet"`
- AND SHALL still include both raw FK ids

#### Scenario: Owner without vets returns null for both

- GIVEN an `Owner` with neither `primary_vet` nor `emergency_vet` set
- WHEN the client retrieves the owner
- THEN `primary_vet_details` SHALL be `null`
- AND `emergency_vet_details` SHALL be `null`

#### Scenario: Writes still accept the raw FK

- GIVEN a client POSTs / PATCHes an owner with `{"primary_vet": 3, "emergency_vet": 7}`
- WHEN the request succeeds
- THEN the persisted owner SHALL have the corresponding `primary_vet_id` and `emergency_vet_id`
- AND subsequent reads SHALL expose both `*_details` projections populated from vets 3 and 7
