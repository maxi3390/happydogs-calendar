# MODIFIED: Backend / Pets

## MODIFIED Requirements

### Requirement: Pet Serializer Payload

The `PetSerializer` payload SHALL continue to include every field of the `Pet` model plus the existing `owner_details`, `vaccinations`, `profile_picture_url`, and `medical_notes_count` projections. In addition, the payload SHALL include a new read-only projection `vet_override_details` that mirrors the vet referenced by `vet_override`.

The `vet_override_details` field SHALL be a compact object (`id`, `name`, `phone`, `email`, `city`) sourced from the related `Vet` record via `source='vet_override'`. It SHALL be `null` when the pet has no `vet_override`.

The raw `vet_override` FK id SHALL remain writable so clients can continue to create / update the pet by posting the vet id alone.

#### Scenario: Pet with vet override exposes nested details

- GIVEN a `Pet` whose `vet_override` points at a `Vet` named "Happy Paws"
- WHEN a client retrieves the pet via `GET /api/pets/<id>/`
- THEN the response body SHALL include `vet_override_details` with `id`, `name = "Happy Paws"`, and the vet's `phone`, `email`, `city`
- AND SHALL still include the raw `vet_override` id alongside it

#### Scenario: Pet without vet override returns null

- GIVEN a `Pet` with no `vet_override`
- WHEN the client retrieves the pet
- THEN `vet_override_details` SHALL be `null`
- AND `vet_override` SHALL be `null`

#### Scenario: Writes still accept the raw FK

- GIVEN a client POSTs / PATCHes a pet with `{"vet_override": 7}`
- WHEN the request succeeds
- THEN the persisted pet SHALL have `vet_override_id = 7`
- AND subsequent reads SHALL expose `vet_override_details` populated from vet 7
