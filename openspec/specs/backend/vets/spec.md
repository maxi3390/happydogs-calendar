# Backend Vets Specification

## Purpose

Model veterinarian clinics and practitioners as a first-class domain entity. Each `Vet` record SHALL carry a structured postal address (via the `Address` abstract mixin) and the identifying / contact information a staff member needs to call a clinic: name, phone, email, free-text notes, plus the standard audit timestamps. Vets are shared resources — an owner can point to the same vet record as another owner, and a pet can override its owner's default vet when care requires a specialist.

## Requirements

### Requirement: Vet Model Structure

The system SHALL provide a `Vet` model with the following fields:

- `name` (required, up to 150 characters) — clinic or practitioner name used as the display label.
- `phone` (optional, up to 20 characters) — primary contact phone number.
- `email` (optional, email-validated) — primary contact email.
- `notes` (optional, text) — free-form operator notes (hours of operation, preferred contact times, payment specifics).
- `created_at` (auto) — timestamp of first insertion.
- `updated_at` (auto) — timestamp of most recent update.

The model SHALL additionally inherit every field from the `Address` abstract mixin: `street`, `city`, `state`, `province`, `country`. All five address fields SHALL be optional so partial addresses are valid.

#### Scenario: Creating a vet with minimal data

- GIVEN a request to create a vet with only a `name`
- WHEN the request is processed
- THEN the record SHALL be persisted with `name` set and every other optional field empty or null

#### Scenario: Creating a vet with full address and contact details

- GIVEN a request to create a vet with `name`, `phone`, `email`, and every address field populated
- WHEN the request is processed
- THEN the persisted record SHALL round-trip every value via a subsequent retrieve call

### Requirement: Vet REST API

The system SHALL expose the `Vet` resource via `/api/vets/` with standard DRF verbs:

- `GET /api/vets/` — list every vet; requires authentication.
- `GET /api/vets/<id>/` — retrieve one vet by primary key; requires authentication.
- `POST /api/vets/` — create a new vet; requires authentication; validates `name` is non-empty.
- `PATCH /api/vets/<id>/` — update any subset of fields; requires authentication.
- `DELETE /api/vets/<id>/` — delete the vet; see "FK behavior on deletion" below.

#### Scenario: Authenticated list returns 200

- GIVEN an authenticated client
- WHEN the client issues `GET /api/vets/`
- THEN the response status SHALL be 200
- AND the body SHALL be a JSON array of vet records

#### Scenario: Unauthenticated list returns 401

- GIVEN an unauthenticated client
- WHEN the client issues `GET /api/vets/`
- THEN the response SHALL indicate authentication is required (401 or 403 per the project auth policy)

#### Scenario: Creating requires a name

- GIVEN a request missing the `name` field
- WHEN `POST /api/vets/` is processed
- THEN the response SHALL be a 400 validation error identifying the missing field

### Requirement: FK Behavior On Deletion

Deleting a `Vet` SHALL set every reference to `NULL` (`on_delete=SET_NULL`). Owner and Pet records that pointed at the deleted vet SHALL survive the deletion with their respective `primary_vet`, `emergency_vet`, or `vet_override` cleared.

#### Scenario: Deleting a vet nulls owner references

- GIVEN an `Owner` whose `primary_vet` references a specific vet
- AND another `Owner` whose `emergency_vet` references the same vet
- WHEN that vet is deleted via `DELETE /api/vets/<id>/`
- THEN both owners SHALL still exist
- AND their `primary_vet` / `emergency_vet` SHALL be `null`

#### Scenario: Deleting a vet nulls pet override

- GIVEN a `Pet` whose `vet_override` references a specific vet
- WHEN that vet is deleted
- THEN the pet SHALL still exist
- AND its `vet_override` SHALL be `null`
