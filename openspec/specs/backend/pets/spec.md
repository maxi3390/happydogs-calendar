# Pet Management Specification

## Purpose

This specification defines the behavior for managing pets within the pet nursery management system. It covers the full lifecycle of pet records including creation, retrieval, updating, deletion, profile picture management, nested vaccination management, and compatibility checking between pets. All pet management endpoints require authentication.

## Requirements

### Requirement: Pet Creation

The system SHALL allow authenticated users to create pet records. A pet record MUST include a name, species, breed, age, temperament, dominance level, size, neutered status, and sex. A pet record MAY optionally include a birth date, weight, special notes, and an associated owner. A pet MAY optionally be created with a list of vaccinations.

#### Scenario: Create a Pet With All Required Fields

- Given an authenticated user provides a valid pet name, species, breed, age, temperament, dominance level, size, neutered status, and sex
- When the user submits the pet creation request
- Then the system SHALL create a new pet record
- And the system SHALL return the created pet details

#### Scenario: Create a Pet Linked to an Owner

- Given an authenticated user provides valid pet data and a valid owner identifier
- When the user submits the pet creation request
- Then the system SHALL create the pet record linked to the specified owner
- And the pet SHALL appear in that owner's list of associated pets

#### Scenario: Create a Pet Without an Owner

- Given an authenticated user provides valid pet data without specifying an owner
- When the user submits the pet creation request
- Then the system SHALL create the pet record with no owner association

#### Scenario: Create a Pet With Vaccinations

- Given an authenticated user provides valid pet data along with a list of vaccination records
- When the user submits the pet creation request
- Then the system SHALL create the pet record
- And the system SHALL create all provided vaccination records associated with the pet

#### Scenario: Create a Pet With Missing Required Fields

- Given an authenticated user omits one or more required fields
- When the user submits the pet creation request
- Then the system SHALL reject the request with a validation error identifying the missing fields

#### Scenario: Create a Pet Without Authentication

- Given an unauthenticated visitor attempts to create a pet
- When the visitor submits the pet creation request
- Then the system SHALL reject the request with an authentication error

### Requirement: Pet Attributes and Validation

The system SHALL enforce the following attribute constraints for pet records:

- **Species** SHALL be one of: dog, cat, bird, rabbit, or other.
- **Temperament** SHALL be one of: calm, playful, aggressive, anxious, or friendly.
- **Dominance level** SHALL be an integer between 1 and 10 inclusive.
- **Size** SHALL be one of: small, medium, or large.
- **Sex** SHALL be one of: male or female.
- **Neutered** SHALL be a boolean value.
- **Age** SHALL be expressed in years.
- **Weight** SHALL be expressed in kilograms when provided.
- **Birth date** MAY be optionally provided.
- **Special notes** MAY be optionally provided as free text.

#### Scenario: Create a Pet With Invalid Species

- Given an authenticated user provides a species value not in the allowed list
- When the user submits the pet creation request
- Then the system SHALL reject the request with a validation error for the species field

#### Scenario: Create a Pet With Out-of-Range Dominance Level

- Given an authenticated user provides a dominance level less than 1 or greater than 10
- When the user submits the pet creation request
- Then the system SHALL reject the request with a validation error for the dominance level field

#### Scenario: Create a Pet With Invalid Temperament

- Given an authenticated user provides a temperament value not in the allowed list
- When the user submits the pet creation request
- Then the system SHALL reject the request with a validation error for the temperament field

#### Scenario: Create a Pet With Invalid Size

- Given an authenticated user provides a size value not in the allowed list
- When the user submits the pet creation request
- Then the system SHALL reject the request with a validation error for the size field

#### Scenario: Create a Pet With Invalid Sex

- Given an authenticated user provides a sex value not in the allowed list
- When the user submits the pet creation request
- Then the system SHALL reject the request with a validation error for the sex field

### Requirement: Pet Listing

The system SHALL allow authenticated users to retrieve a paginated list of pet records. The list response SHALL use the standard pagination envelope `{count, next, previous, results}`, where `results` holds the page of serialized pets. The default page size SHALL be 50, overridable per request via a `page_size` query parameter up to a bounded maximum. Each pet in the list SHALL include a count of its associated medical notes.

Listing SHALL be efficient: the number of database queries SHALL NOT grow with the number of pets returned. `medical_notes_count` SHALL be provided via a query annotation (not a per-row `COUNT`), and the owner / vet relations serialized in the list SHALL be fetched with `select_related`, with nested vaccinations `prefetch_related`.

#### Scenario: List All Pets

- Given an authenticated user requests the list of pets
- When the system processes the request
- Then the system SHALL return a paginated envelope with `count`, `next`, `previous`, and `results`
- And each pet record SHALL include a medical notes count

#### Scenario: Listing pets issues a constant number of queries

- Given several pets exist, each with medical notes and a vet
- When the list endpoint is queried
- Then the number of SQL queries SHALL be independent of the number of pets

#### Scenario: Page size can be overridden within bounds

- Given more pets exist than the default page size
- When the user requests the list with `page_size=10`
- Then `results` SHALL contain at most 10 pets
- And a `page_size` larger than the configured maximum SHALL be capped

#### Scenario: List Pets When No Pets Exist

- Given an authenticated user requests the list of pets and no pet records exist
- When the system processes the request
- Then the system SHALL return an envelope with `count` 0 and an empty `results` list

### Requirement: Pet Retrieval

The system SHALL allow authenticated users to retrieve the full details of a single pet by its identifier. The response SHALL include a count of associated medical notes.

#### Scenario: Retrieve an Existing Pet

- Given an authenticated user requests a pet by a valid identifier
- When the system processes the request
- Then the system SHALL return the full pet details including the medical notes count

#### Scenario: Retrieve a Non-Existent Pet

- Given an authenticated user requests a pet by an identifier that does not exist
- When the system processes the request
- Then the system SHALL return a not-found error

### Requirement: Pet Updating

The system SHALL allow authenticated users to update an existing pet record. When vaccinations are included in an update, the system SHALL replace all existing vaccinations atomically — all previous vaccination records for that pet SHALL be removed and replaced with the newly provided set.

#### Scenario: Update Pet Basic Fields

- Given an authenticated user provides updated values for a pet's basic fields (e.g., name, breed, weight)
- When the user submits the pet update request
- Then the system SHALL update the pet record with the new values
- And the system SHALL return the updated pet details

#### Scenario: Update Pet With New Vaccinations

- Given an authenticated user provides a new list of vaccinations for an existing pet
- When the user submits the pet update request
- Then the system SHALL remove all existing vaccination records for the pet
- And the system SHALL create all newly provided vaccination records
- And this operation SHALL be performed atomically

#### Scenario: Update Pet With Empty Vaccinations List

- Given an authenticated user provides an empty list of vaccinations for an existing pet that has existing vaccinations
- When the user submits the pet update request
- Then the system SHALL remove all existing vaccination records for the pet
- And the pet SHALL have zero vaccination records afterward

#### Scenario: Update a Non-Existent Pet

- Given an authenticated user attempts to update a pet that does not exist
- When the user submits the pet update request
- Then the system SHALL return a not-found error

### Requirement: Pet Deletion

The system SHALL allow authenticated users to delete a pet record by its identifier.

#### Scenario: Delete an Existing Pet

- Given an authenticated user requests deletion of an existing pet
- When the system processes the request
- Then the system SHALL delete the pet record
- And all associated data (vaccinations, schedules) SHALL be removed

#### Scenario: Delete a Non-Existent Pet

- Given an authenticated user requests deletion of a pet that does not exist
- When the system processes the request
- Then the system SHALL return a not-found error

### Requirement: Owner Association and Cascade Deletion

A pet MAY be optionally linked to an owner through a foreign key relationship. When an owner is deleted, all pets associated with that owner MUST be deleted automatically through cascade deletion.

#### Scenario: Owner Deletion Cascades to Pets

- Given an owner has three associated pets
- When the owner is deleted
- Then all three pet records SHALL be deleted automatically
- And no orphaned pet records SHALL remain

#### Scenario: Pet With No Owner Is Unaffected by Owner Deletion

- Given a pet has no associated owner
- When any owner is deleted
- Then the pet record SHALL remain unaffected

### Requirement: Profile Picture Upload

The system SHALL allow authenticated users to upload a profile picture for a pet. The uploaded image MUST NOT exceed 5 MB in size. The system SHALL accept only JPEG, PNG, GIF, and WEBP image formats.

#### Scenario: Upload a Valid Profile Picture

- Given an authenticated user provides a valid image file (JPEG, PNG, GIF, or WEBP) under 5 MB
- When the user submits the profile picture upload for an existing pet
- Then the system SHALL store the image
- And the system SHALL return the updated pet record with the profile picture URL

#### Scenario: Upload a Profile Picture Exceeding Size Limit

- Given an authenticated user provides an image file larger than 5 MB
- When the user submits the profile picture upload
- Then the system SHALL reject the request with a validation error indicating the file exceeds the maximum size

#### Scenario: Upload a Profile Picture With Invalid Format

- Given an authenticated user provides a file that is not a JPEG, PNG, GIF, or WEBP image
- When the user submits the profile picture upload
- Then the system SHALL reject the request with a validation error indicating the file format is not supported

### Requirement: Profile Picture Deletion

The system SHALL allow authenticated users to delete a pet's profile picture. After deletion, the pet record SHALL have no profile picture.

#### Scenario: Delete an Existing Profile Picture

- Given a pet has an associated profile picture
- When an authenticated user requests deletion of the pet's profile picture
- Then the system SHALL remove the profile picture
- And the pet record SHALL reflect that no profile picture exists

#### Scenario: Delete Profile Picture When None Exists

- Given a pet has no profile picture
- When an authenticated user requests deletion of the pet's profile picture
- Then the system SHOULD handle the request gracefully without error

### Requirement: Compatibility Check

The system SHALL provide an endpoint to check the compatibility of a specific pet against all other pets in the system. The system SHALL evaluate compatibility based on five rules and return a list of incompatible pets with the reasons for incompatibility.

The five compatibility rules are:

1. **Aggressive Pet Rule**: A pet with an aggressive temperament SHALL be deemed incompatible with every other pet.
2. **High Dominance Rule**: Two pets that both have a dominance level greater than 7 SHALL be deemed incompatible.
3. **Size and Dominance Disparity Rule**: Two pets with a size difference of 2 or more levels (where small=1, medium=2, large=3) AND a dominance level difference of 5 or more SHALL be deemed incompatible.
4. **Cross-Species Temperament Rule**: Two pets of different species where the temperament pair is (aggressive, anxious) or (aggressive, calm) in any order SHALL be deemed incompatible.
5. **Anxious-Playful Dominance Rule**: Two pets where one is anxious and the other is playful, and their dominance level difference is greater than 4, SHALL be deemed incompatible.

A single pair of pets MAY trigger multiple incompatibility rules simultaneously. All triggered rules SHALL be reported.

For each incompatible pet, the response SHALL include:

- A `reasons` field: a list of **every** triggered rule for that pair, in evaluation order. This list SHALL be non-empty for incompatible pairs.
- A `reason` field: the first entry of `reasons` (the first triggered rule), preserved for backward compatibility with earlier clients that expected a single reason string.

When a pet is compatible with the subject pet (no rules triggered), that pet SHALL NOT appear in the incompatibility results. Equivalently, `reasons` is only ever reported as a non-empty list; there is no entry with an empty `reasons` list.

#### Scenario: Aggressive Pet Is Incompatible With All Others

- Given a pet has an aggressive temperament
- And other pets exist in the system
- When an authenticated user requests a compatibility check for the aggressive pet
- Then the system SHALL return all other pets as incompatible
- And for each incompatibility the response SHALL include a `reasons` list containing the aggressive pet rule
- And the `reason` field SHALL contain the first triggered rule (the aggressive pet rule) for backward compatibility

#### Scenario: Two High-Dominance Pets Are Incompatible

- Given pet A has a dominance level of 8
- And pet B has a dominance level of 9
- When an authenticated user requests a compatibility check for pet A
- Then pet B SHALL be listed as incompatible
- And the `reasons` list SHALL contain the high dominance rule
- And the `reason` field SHALL contain the first triggered rule for backward compatibility

#### Scenario: Size and Dominance Disparity Causes Incompatibility

- Given pet A is small (level 1) with a dominance level of 2
- And pet B is large (level 3) with a dominance level of 8
- When an authenticated user requests a compatibility check for pet A
- Then pet B SHALL be listed as incompatible
- And the `reasons` list SHALL contain the size and dominance disparity rule (size difference = 2, dominance difference = 6)
- And the `reason` field SHALL contain the first triggered rule for backward compatibility

#### Scenario: Size Difference Alone Does Not Cause Incompatibility

- Given pet A is small (level 1) with a dominance level of 5
- And pet B is large (level 3) with a dominance level of 6
- When an authenticated user requests a compatibility check for pet A
- Then pet B SHALL NOT be listed as incompatible under the size and dominance disparity rule (dominance difference = 1, which is less than 5)

#### Scenario: Cross-Species Aggressive-Anxious Pair Is Incompatible

- Given pet A is a dog with an aggressive temperament
- And pet B is a cat with an anxious temperament
- When an authenticated user requests a compatibility check for pet A
- Then pet B SHALL be listed as incompatible
- And the `reasons` list SHALL contain the cross-species temperament rule (and MAY also contain the aggressive pet rule)
- And the `reason` field SHALL contain the first triggered rule for backward compatibility

#### Scenario: Cross-Species Aggressive-Calm Pair Is Incompatible

- Given pet A is a bird with an aggressive temperament
- And pet B is a rabbit with a calm temperament
- When an authenticated user requests a compatibility check for pet A
- Then pet B SHALL be listed as incompatible
- And the `reasons` list SHALL contain the cross-species temperament rule (and MAY also contain the aggressive pet rule)
- And the `reason` field SHALL contain the first triggered rule for backward compatibility

#### Scenario: Same-Species Aggressive-Anxious Pair Does Not Trigger Cross-Species Rule

- Given pet A is a dog with an aggressive temperament
- And pet B is a dog with an anxious temperament
- When an authenticated user requests a compatibility check for pet A
- Then the cross-species temperament rule SHALL NOT be triggered for this pair
- But pet A SHALL still be incompatible with pet B due to the aggressive pet rule

#### Scenario: Anxious-Playful Pair With High Dominance Difference Is Incompatible

- Given pet A is anxious with a dominance level of 2
- And pet B is playful with a dominance level of 8
- When an authenticated user requests a compatibility check for pet A
- Then pet B SHALL be listed as incompatible
- And the `reasons` list SHALL contain the anxious-playful dominance rule (dominance difference = 6, which is greater than 4)
- And the `reason` field SHALL contain the first triggered rule for backward compatibility

#### Scenario: Anxious-Playful Pair With Low Dominance Difference Is Compatible

- Given pet A is anxious with a dominance level of 5
- And pet B is playful with a dominance level of 7
- When an authenticated user requests a compatibility check for pet A
- Then pet B SHALL NOT be listed as incompatible under the anxious-playful dominance rule (dominance difference = 2, which is not greater than 4)

#### Scenario: Multiple Rules Triggered for Same Pair

- Given pet A is a small aggressive dog with dominance level 9
- And pet B is a large anxious cat with dominance level 2
- When an authenticated user requests a compatibility check for pet A
- Then pet B SHALL be listed as incompatible
- And the `reasons` list SHALL contain all three triggered rules: the aggressive pet rule, the size and dominance disparity rule, and the cross-species temperament rule
- And the `reason` field SHALL contain the first entry of `reasons` (the first triggered rule in evaluation order) for backward compatibility

#### Scenario: Compatible Pet Not Listed

- Given pet A is a medium, calm dog with dominance level 5
- And pet B is a medium, friendly dog with dominance level 4
- When an authenticated user requests a compatibility check for pet A
- Then pet B SHALL NOT appear in the incompatibility results
- And no entry for pet B SHALL be returned (the `reasons` list for that pair would be empty, so it is omitted from the response)

#### Scenario: Compatibility Check for Non-Existent Pet

- Given an authenticated user requests a compatibility check for a pet identifier that does not exist
- When the system processes the request
- Then the system SHALL return a not-found error

#### Scenario: Compatibility Check Without Authentication

- Given an unauthenticated visitor requests a compatibility check
- When the system processes the request
- Then the system SHALL reject the request with an authentication error

### Requirement: Authentication Enforcement

All pet management endpoints MUST require authentication. Any request from an unauthenticated visitor SHALL be rejected with an authentication error.

#### Scenario: Unauthenticated Access to Any Pet Endpoint

- Given an unauthenticated visitor
- When the visitor attempts to access any pet management endpoint (list, create, retrieve, update, delete, profile picture, or compatibility check)
- Then the system SHALL reject the request with an authentication error

### Requirement: Pet Vet Override

Each `Pet` SHALL expose a nullable `vet_override` foreign key pointing at the `Vet` model (defined in the `backend/vets` capability), using `on_delete=SET_NULL`. When set, it overrides the owner's `primary_vet` for this specific pet (for example: an exotic pet that needs a specialist clinic distinct from the owner's regular vet).

A Pet SHALL additionally expose an `effective_vet` read-only accessor that resolves, in order: `vet_override` if set, else `owner.primary_vet` if the pet has an owner with a primary vet, else `None`. The accessor SHALL NOT trigger database queries when the related records are already loaded.

#### Scenario: Pet with no override falls back to owner's primary vet

- GIVEN a pet whose owner has `primary_vet` set
- AND the pet has `vet_override` unset
- WHEN code reads `pet.effective_vet`
- THEN it SHALL return the owner's `primary_vet`

#### Scenario: Pet with override wins over owner's primary

- GIVEN a pet with `vet_override` set
- AND the pet's owner also has a different `primary_vet` set
- WHEN code reads `pet.effective_vet`
- THEN it SHALL return `vet_override`, not the owner's `primary_vet`

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
- AND `effective_vet` SHALL fall back to the owner's `primary_vet` (or None)

### Requirement: Pet Serializer Payload

The `PetSerializer` payload SHALL continue to include every field of the `Pet` model plus the existing `owner_details`, `vaccinations`, `profile_picture_url`, and `medical_notes_count` projections. In addition, the payload SHALL include three read-only vet projections that share a compact field set (`id`, `name`, `phone`, `email`, `city`):

- `vet_override_details` — sourced from the related `Vet` record via `source='vet_override'`. `null` when the pet has no `vet_override`.
- `effective_vet_details` — resolved via the `Pet.effective_vet` property: the override when set, otherwise the owner's `primary_vet`, otherwise `null`. Surfaces the vet actually responsible for the pet regardless of which field holds the value.
- `emergency_vet_details` — sourced from the pet's owner's `emergency_vet`. `null` when the pet has no owner or the owner has no emergency vet.

The raw `vet_override` FK id SHALL remain writable so clients can continue to create / update the pet by posting the vet id alone. The other vet projections are read-only.

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
## ADDED Requirements

### Requirement: Pet model SHALL store the last internal and external deworming dates

The `Pet` model SHALL expose two optional date fields:

- `last_internal_deworming_date` — date of the last internal (intestinal) deworming treatment.
- `last_external_deworming_date` — date of the last external (flea / tick) deworming treatment.

Both fields SHALL be optional (`null=True, blank=True`). The serializer SHALL include both fields in every list / detail response and accept them on `POST` / `PATCH` / `PUT`.

The deworming dates SHALL be persisted regardless of the `deworming_tracking` feature flag — the flag controls only the frontend surface, never the database.

#### Scenario: Defaults are null when not provided

- GIVEN a `POST /api/pets/` payload that omits both deworming fields
- WHEN the pet is created
- THEN the response body's `last_internal_deworming_date` SHALL be `null`
- AND the response body's `last_external_deworming_date` SHALL be `null`

#### Scenario: Both dates can be set on create

- GIVEN a `POST /api/pets/` payload with `last_internal_deworming_date = "2026-01-01"` and `last_external_deworming_date = "2026-04-01"`
- WHEN the pet is created
- THEN the response body's two fields SHALL match the request
- AND the same values SHALL be persisted in the database

#### Scenario: PATCH null clears a previously-set date

- GIVEN a pet with `last_internal_deworming_date = "2026-04-01"`
- WHEN a `PATCH /api/pets/<id>/` is sent with `{ "last_internal_deworming_date": null }`
- THEN the request SHALL succeed (HTTP 200)
- AND the pet's `last_internal_deworming_date` SHALL be `null`

#### Scenario: PATCH sets a single date

- GIVEN a pet with both deworming dates `null`
- WHEN a `PATCH /api/pets/<id>/` is sent with `{ "last_external_deworming_date": "2026-04-25" }`
- THEN the request SHALL succeed
- AND only `last_external_deworming_date` SHALL change

### Requirement: Deworming-tracking feature flag SHALL be seeded disabled

The seed migration SHALL create a `FeatureFlag` row with `key = "deworming_tracking"`, with `enabled = False`. The migration's `unseed` SHALL be a no-op so reverting the migration never silently flips the flag off in environments that depend on it.

The seed SHALL be idempotent — re-running `migrate` after the flag has been toggled in production SHALL NOT reset the `enabled` value.

#### Scenario: Migration creates the row when missing

- GIVEN a database without the `deworming_tracking` flag row
- WHEN `migrate` runs
- THEN a `FeatureFlag` row with `key = "deworming_tracking"` SHALL exist with `enabled = False`

#### Scenario: Migration leaves toggled rows alone

- GIVEN the `deworming_tracking` flag exists with `enabled = True`
- WHEN `migrate` runs again
- THEN the flag's `enabled` value SHALL remain `True`

## Requirements (added via conflict-detection-improvements)

### Requirement: Pet incompatibility rules SHALL be persisted as a backend model

The system SHALL provide a `PetIncompatibility` model storing per-pet-pair incompatibility rules, exposed via a REST API under `/api/pet-incompatibilities/`. Each rule SHALL reference two distinct pets and carry a free-text `reason`.

The pair SHALL be order-independent: a rule between Luna and Milo and a rule between Milo and Luna SHALL be the **same row**. Implementation SHALL store the lower pet id as `pet1` and the higher as `pet2` and enforce `unique_together = ('pet1', 'pet2')`.

The serializer SHALL reject self-pairs (`pet1 == pet2`) at validation time.

Both `pet1` and `pet2` SHALL cascade-delete with their owning `Pet` row.

#### Scenario: Create, list, retrieve, update, delete

- GIVEN an authenticated user
- WHEN they POST a new rule between two pets
- THEN the rule SHALL be stored with `pet1_id < pet2_id` regardless of POST order
- AND subsequent `GET /api/pet-incompatibilities/` SHALL include the rule
- AND `GET /api/pet-incompatibilities/{id}/` SHALL return it
- AND `PATCH` SHALL update the `reason`
- AND `DELETE` SHALL remove it

#### Scenario: Order-independent uniqueness

- GIVEN a rule already exists between pets A and B
- WHEN a client POSTs a second rule between B and A (or A and B again)
- THEN the request SHALL fail with HTTP 400 (unique constraint violation, surfaced as a serializer error)

#### Scenario: Self-pair rejected

- GIVEN an authenticated user
- WHEN they POST a rule with `pet1 == pet2`
- THEN the request SHALL fail with HTTP 400
- AND the response SHALL surface a serializer-level error explaining a pet cannot be incompatible with itself

#### Scenario: Cascade on pet delete

- GIVEN an existing rule between pets A and B
- WHEN pet A is deleted
- THEN the rule SHALL be deleted automatically
- AND the rule SHALL NOT appear in any subsequent list call

### Requirement: `Pet.is_compatible_with(other)` SHALL consult persisted custom rules

`Pet.is_compatible_with(other) → (bool, list[str])` SHALL evaluate every applicable hardcoded rule AND query `PetIncompatibility` for any persisted rule between the two pets. Each triggered hardcoded rule's reason and any persisted rule's `reason` SHALL be appended to the returned list. The pet pair SHALL be considered incompatible (returned `bool` is `False`) if at least one rule (hardcoded or persisted) fires.

#### Scenario: Custom rule fires alongside hardcoded rules

- GIVEN two pets where rule 1 (aggressive) already fires
- AND a persisted custom rule exists between them with `reason = "Vet advised separation"`
- WHEN `pet.is_compatible_with(other)` is called
- THEN the returned `reasons` list SHALL contain BOTH the rule-1 translation key AND the literal `"Vet advised separation"` (custom rules are free text and are NOT translated)
- AND the returned bool SHALL be `False`

#### Scenario: Custom rule alone makes the pair incompatible

- GIVEN two pets that pass every hardcoded rule (would be reported compatible)
- AND a persisted custom rule exists between them
- WHEN `pet.is_compatible_with(other)` is called
- THEN the returned bool SHALL be `False`
- AND the returned `reasons` SHALL contain only the custom rule's reason

### Requirement: Same-species same-sex highly-dominant pets rule (rule 6)

`Pet.is_compatible_with(other)` SHALL emit a new same-species/same-sex/both-dominant warning when ALL of the following are true:

- `self.species == other.species`
- `self.sex == other.sex`
- `self.dominance_level >= 7 AND other.dominance_level >= 7`

This rule SHALL be evaluated independently of rule 2 (two highly dominant pets, both `> 7`). Both reasons MAY appear in the result list when both conditions are met.

#### Scenario: Rule 6 fires at the boundary

- GIVEN two dogs of the same sex, both with `dominance_level = 7`
- WHEN `pet.is_compatible_with(other)` is called
- THEN rule 6 SHALL fire (both dominance levels are `>= 7`, same species, same sex)
- AND rule 2 SHALL NOT fire (rule 2 requires both `> 7`)
- AND the returned `reasons` SHALL contain exactly one entry — rule 6's translation key

#### Scenario: Rule 6 and rule 2 fire together

- GIVEN two dogs of the same sex, both with `dominance_level = 9`
- WHEN `pet.is_compatible_with(other)` is called
- THEN rule 2 SHALL fire (both `> 7`)
- AND rule 6 SHALL fire (same species + same sex + both `>= 7`)
- AND the returned `reasons` SHALL contain BOTH entries

#### Scenario: Rule 6 does not fire across species

- GIVEN a dog and a cat, both with `dominance_level = 9` and same sex
- WHEN `pet.is_compatible_with(other)` is called
- THEN rule 6 SHALL NOT fire (different species)
- AND rule 2 MAY still fire if it would on its own merits

### Requirement: Compatibility reasons SHALL be returned as i18n keys (not literal text)

`Pet.is_compatible_with(other)` SHALL return, for every triggered hardcoded rule, the rule's translation key (e.g. `schedule.conflictReasons.aggressive`) instead of the literal English warning text. The frontend resolves each key through its translation lookup at render time, which keeps the warning text owned in `backend/translations/{en,es}.json` rather than inlined in the model.

The catalog of keys SHALL be:

| Rule | Translation key |
|------|-----------------|
| Rule 1 — aggressive pet pair | `schedule.conflictReasons.aggressive` |
| Rule 2 — both pets dominance `> 7` | `schedule.conflictReasons.bothHighDominance` |
| Rule 3 — size diff ≥ 2 AND dominance diff ≥ 5 | `schedule.conflictReasons.sizeAndDominanceDiff` |
| Rule 4 — different species + incompatible temperaments | `schedule.conflictReasons.crossSpeciesIncompatibleTemperaments` |
| Rule 5 — anxious vs playful with dominance diff `> 4` | `schedule.conflictReasons.anxiousVsPlayful` |
| Rule 6 — same species + same sex + both dominance `>= 7` | `schedule.conflictReasons.sameSpeciesSameSexHighlyDominant` |

Custom rules (rows in `PetIncompatibility`) carry a free-text `reason` and SHALL be appended to the returned list verbatim. The frontend's translation lookup MUST fall through unmatched keys, returning the input string unchanged, so custom rules display as the operator wrote them.

The keys SHALL be exposed as class constants on `Pet` (`Pet.CONFLICT_REASON_AGGRESSIVE`, etc.) so callers can compare against them without hardcoding the string in tests.

#### Scenario: A triggered hardcoded rule returns its translation key

- GIVEN two pets that trigger rule 1 (one is aggressive)
- WHEN `pet.is_compatible_with(other)` is called
- THEN the returned `reasons` list SHALL contain `Pet.CONFLICT_REASON_AGGRESSIVE` (`schedule.conflictReasons.aggressive`)
- AND it SHALL NOT contain the literal English string `"Aggressive pets cannot be scheduled together with other pets"`

#### Scenario: A custom rule's free text is appended unchanged

- GIVEN a persisted custom rule with `reason = "Vet advised separation"`
- AND the two pets that the rule names
- WHEN `pet.is_compatible_with(other)` is called
- THEN the returned `reasons` list SHALL contain the literal string `"Vet advised separation"`
- AND that string SHALL NOT be wrapped in or replaced by any translation key

#### Scenario: Translation file owns the warning text

- GIVEN the operator's preferred language is English
- WHEN the frontend renders a conflict warning whose `reason` is `schedule.conflictReasons.aggressive`
- THEN the rendered text SHALL come from `backend/translations/en.json`'s `schedule.conflictReasons.aggressive` value
- AND swapping the operator's preferred language to Spanish SHALL change the rendered text without any backend change

