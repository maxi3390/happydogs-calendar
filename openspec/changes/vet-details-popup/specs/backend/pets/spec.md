# MODIFIED: Backend / Pets

## MODIFIED Requirements

### Requirement: Pet Serializer Payload

The `PetSerializer` payload SHALL continue to include every field of the `Pet` model plus the existing `owner_details`, `vaccinations`, `profile_picture_url`, and `medical_notes_count` projections. In addition, the payload SHALL include three new read-only vet projections:

- `vet_override_details` — a compact object (`id`, `name`, `phone`, `email`, `city`) sourced from the related `Vet` record via `source='vet_override'`. `null` when the pet has no `vet_override`.
- `effective_vet_details` — the same compact object, resolved via the `Pet.effective_vet` property: the override when set, otherwise the owner's `primary_vet`, otherwise `null`. Surfaces the vet actually responsible for the pet regardless of which field holds it.
- `emergency_vet_details` — the same compact object, sourced from the pet's owner's `emergency_vet`. `null` when the pet has no owner or the owner has no emergency vet.

All three projections SHALL share the same compact field set (`id`, `name`, `phone`, `email`, `city`). The raw `vet_override` FK id SHALL remain writable so clients can continue to create / update the pet by posting the vet id alone.

#### Scenario: Pet with vet override exposes all three projections

- GIVEN a `Pet` whose `vet_override` points at a `Vet` named "Specialist Clinic"
- AND whose owner's `primary_vet` points at a different `Vet` named "Happy Paws"
- AND whose owner's `emergency_vet` points at a third `Vet` named "Nightline"
- WHEN a client retrieves the pet via `GET /api/pets/<id>/`
- THEN the response body SHALL include `vet_override_details` with `name = "Specialist Clinic"`
- AND SHALL include `effective_vet_details` with `name = "Specialist Clinic"` (because the override wins)
- AND SHALL include `emergency_vet_details` with `name = "Nightline"`

#### Scenario: Pet without vet override falls back to owner primary on effective_vet_details

- GIVEN a `Pet` with no `vet_override`
- AND whose owner has `primary_vet` set to "Happy Paws"
- WHEN the client retrieves the pet
- THEN `vet_override_details` SHALL be `null`
- AND `effective_vet_details` SHALL be populated with `name = "Happy Paws"`

#### Scenario: Pet with no resolvable vet

- GIVEN a `Pet` with no `vet_override` and either no owner or an owner with no `primary_vet`
- WHEN the client retrieves the pet
- THEN `vet_override_details` SHALL be `null`
- AND `effective_vet_details` SHALL be `null`

#### Scenario: Pet emergency vet comes from the owner

- GIVEN a `Pet` whose owner has `emergency_vet` set to "Nightline"
- WHEN the client retrieves the pet
- THEN `emergency_vet_details` SHALL be populated with `name = "Nightline"`

#### Scenario: Pet without an owner returns null emergency vet

- GIVEN a `Pet` whose `owner` is `null`
- WHEN the client retrieves the pet
- THEN `emergency_vet_details` SHALL be `null`

#### Scenario: Pet whose owner has no emergency vet returns null emergency vet

- GIVEN a `Pet` whose owner has no `emergency_vet`
- WHEN the client retrieves the pet
- THEN `emergency_vet_details` SHALL be `null`

#### Scenario: Writes still accept the raw FK

- GIVEN a client POSTs / PATCHes a pet with `{"vet_override": 7}`
- WHEN the request succeeds
- THEN the persisted pet SHALL have `vet_override_id = 7`
- AND subsequent reads SHALL expose `vet_override_details` populated from vet 7
- AND SHALL expose `effective_vet_details` populated from vet 7 (override wins over the owner's primary)
