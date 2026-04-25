# MODIFIED: Backend / Pets

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
