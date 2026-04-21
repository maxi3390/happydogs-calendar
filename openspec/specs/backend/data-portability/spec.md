# Backend: Data Portability Specification

## Purpose

Give operators a user-facing backup / restore path that complements `make backup` / `make restore`: a single file they can download before a risky operation (e.g. a version bump) and upload back if they need to revert. Scope is **domain data**, not the filesystem or auth tables, so restoring a backup never invalidates the active session or clobbers the superuser.

## Requirements

### Requirement: Full-Data Export

The backend SHALL expose `GET /api/data-portability/export?format=<json|csv>` that returns a complete snapshot of the operator's domain data in the requested format. The endpoint SHALL require JWT authentication.

Covered entities (in this order): `NurserySetting`, `VaccinationType`, `Vet`, `Owner`, `Pet`, `Vaccination`, `MedicalNote`, `Schedule`. Primary keys SHALL be preserved so foreign-key ids remain valid across a round-trip. User accounts, uploaded file contents, and profile pictures are out of scope.

#### Scenario: Default format is JSON

- WHEN the operator issues `GET /api/data-portability/export`
- THEN the response SHALL be `200 OK` with `Content-Type: application/json`
- AND the body SHALL be a JSON envelope with `version`, `exported_at`, and an `entities` object containing the eight entity arrays in the documented order

#### Scenario: CSV format returns a ZIP

- WHEN the operator issues `GET /api/data-portability/export?format=csv`
- THEN the response SHALL be `200 OK` with `Content-Type: application/zip`
- AND the ZIP SHALL contain `manifest.json` plus one `.csv` per covered entity

#### Scenario: Round-trip determinism

- GIVEN two successive exports of the same DB state (no writes between)
- WHEN both bodies are compared
- THEN the byte sequences SHALL be identical

### Requirement: Full-Data Import

The backend SHALL expose `POST /api/data-portability/import` that accepts a multipart file upload in either the JSON envelope format or the ZIP-of-CSV format produced by the export endpoint. The endpoint SHALL require JWT authentication.

Import semantics are **replace**: the importer SHALL delete all existing rows of the covered entities (in reverse dependency order) and reinsert the payload (in forward order) inside a single atomic database transaction. A failure at any step SHALL roll the transaction back entirely, leaving the DB exactly as it was before the request.

#### Scenario: JSON import succeeds

- GIVEN a well-formed JSON export produced by this server
- WHEN the operator POSTs the file to `/api/data-portability/import`
- THEN the response SHALL be `200 OK` with a JSON body summarising per-entity row counts
- AND each entity's row count in the DB SHALL match the payload

#### Scenario: ZIP import succeeds

- GIVEN a well-formed ZIP export produced by this server
- WHEN the operator POSTs the file to `/api/data-portability/import`
- THEN the response SHALL be `200 OK` and the DB SHALL reflect the payload

#### Scenario: Format auto-detection

- GIVEN a file whose first bytes are `{` (ASCII left-brace)
- THEN the importer SHALL treat it as JSON

- GIVEN a file whose first bytes are `PK\x03\x04`
- THEN the importer SHALL treat it as a ZIP

- GIVEN a file with any other leading bytes
- THEN the importer SHALL refuse with `400 Bad Request` and an error message naming the problem

#### Scenario: Invalid data rolls back

- GIVEN a JSON payload whose `pets[42].owner` references an owner id not present in the `owners` array
- WHEN the import runs
- THEN the transaction SHALL abort before commit
- AND the response SHALL be `400 Bad Request` with `{"detail": "...", "entity": "pets", "row_index": 42, "error": "..."}`
- AND the DB SHALL be unchanged from the pre-request state

#### Scenario: Version mismatch

- GIVEN a JSON payload with `version != 1`
- WHEN the import runs
- THEN the response SHALL be `400 Bad Request`
- AND the DB SHALL be unchanged

### Requirement: Authentication Enforcement

Both export and import endpoints SHALL require a valid JWT access token. Unauthenticated requests SHALL receive `401 Unauthorized` and SHALL NOT produce any side effect.

#### Scenario: Export requires auth

- GIVEN no Authorization header
- WHEN the operator issues `GET /api/data-portability/export`
- THEN the response SHALL be `401 Unauthorized`

#### Scenario: Import requires auth

- GIVEN no Authorization header
- WHEN the operator issues `POST /api/data-portability/import`
- THEN the response SHALL be `401 Unauthorized`
- AND the DB SHALL be unchanged
