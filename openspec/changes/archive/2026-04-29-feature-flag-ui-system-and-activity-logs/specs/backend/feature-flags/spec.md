# MODIFIED: Backend / Feature Flags

## MODIFIED Requirements

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
