# Backend: Feature Flags Specification

## Purpose

Let operators toggle specific product surfaces (UI sections, experimental features) on and off without a code deploy, and let engineers ship half-built features behind a flag. The system is intentionally minimal: global boolean flags keyed by a stable slug, persisted in the database, editable by admins.

## Requirements

### Requirement: Feature Flag Model

The system SHALL persist feature flags as rows in a `FeatureFlag` table keyed by a unique `key` slug. Each row SHALL carry a human-readable `label`, an optional `description`, a boolean `enabled` state, and an `updated_at` timestamp.

#### Scenario: Flag creation via migration

- GIVEN a fresh database
- WHEN `migrate` runs
- THEN the `feature_flags_featureflag` table SHALL exist
- AND the canonical flags (`multiday_schedule`, `custom_pet_species`, `vet_management`, `medical_notes`, `data_backup`, `compatibility_warnings`, `deworming_tracking`, `notifications`, `ui_system`, `activity_logs`) SHALL be present with their documented defaults
- AND the `notifications` flag SHALL be seeded `enabled = False` (off by default)
- AND the `ui_system` flag SHALL be seeded `enabled = False` (developer reference page, off by default)
- AND the `activity_logs` flag SHALL be seeded `enabled = True` (audit feed, on by default)

#### Scenario: Repeated migrate is idempotent

- GIVEN `migrate` has completed once
- WHEN `migrate` runs a second time
- THEN no new rows SHALL be created
- AND no existing `enabled` values SHALL be overwritten

### Requirement: List Endpoint Is Readable By Every Authenticated User

`GET /api/feature-flags/` SHALL return the full set of flags to any authenticated caller, regardless of role. The frontend needs this to decide which UI sections to render for a plain staff user.

#### Scenario: Staff user sees flags

- GIVEN a non-admin authenticated user
- WHEN they issue `GET /api/feature-flags/`
- THEN the response SHALL be `200 OK` with an array including every seeded flag

#### Scenario: Unauthenticated caller is refused

- GIVEN no `Authorization` header
- WHEN `GET /api/feature-flags/` is called
- THEN the response SHALL be `401 Unauthorized`

### Requirement: Toggling Is Admin-Only

`PATCH /api/feature-flags/<key>/` SHALL be restricted to users whose `role` is `admin`. Non-admins SHALL NOT be able to change a flag's `enabled` state, and the row SHALL be unchanged on a refused request.

#### Scenario: Admin toggles a flag

- GIVEN an admin user and a flag currently `enabled=True`
- WHEN the admin issues `PATCH /api/feature-flags/vet_management/` with `{"enabled": false}`
- THEN the response SHALL be `200 OK` with the updated row
- AND a subsequent `GET` SHALL show `enabled=False`

#### Scenario: Non-admin attempt is refused

- GIVEN a non-admin authenticated user
- WHEN they issue `PATCH /api/feature-flags/vet_management/` with `{"enabled": false}`
- THEN the response SHALL be `403 Forbidden`
- AND the row SHALL remain at its prior value

#### Scenario: `key` is read-only

- GIVEN an admin user
- WHEN they include `"key": "something_else"` in the PATCH body
- THEN the `key` SHALL NOT be changed

### Requirement: Create And Delete Are Disallowed

The endpoint SHALL refuse `POST` and `DELETE` requests. Flags are added by code (data migrations), not by API callers.

#### Scenario: POST is rejected

- WHEN any client issues `POST /api/feature-flags/`
- THEN the response SHALL be `405 Method Not Allowed`

#### Scenario: DELETE is rejected

- WHEN any client issues `DELETE /api/feature-flags/<key>/`
- THEN the response SHALL be `405 Method Not Allowed`

### Requirement: `is_feature_enabled` Service Helper

Backend code SHALL check a flag state via a small helper that returns a plain boolean:

```python
from feature_flags.services import is_feature_enabled
if is_feature_enabled('vet_management'):
    ...
```

The helper SHALL return `False` for keys that do not exist in the DB (fail-closed).

#### Scenario: Present and enabled

- GIVEN a row `(key='vet_management', enabled=True)`
- THEN `is_feature_enabled('vet_management')` returns `True`

#### Scenario: Present and disabled

- GIVEN a row `(key='vet_management', enabled=False)`
- THEN `is_feature_enabled('vet_management')` returns `False`

#### Scenario: Missing key

- GIVEN no row with `key='unknown'`
- THEN `is_feature_enabled('unknown')` returns `False`
