# Frontend: Feature Flags Specification

## Purpose

Give the UI a simple way to read the system-wide feature-flag map, gate UI sections on the flag state, and provide an admin with a single page to flip flags without a code deploy.

## Requirements

### Requirement: Provider And `useFeatureFlag` Hook

The app SHALL mount a `FeatureFlagsProvider` high in the component tree that loads the full map of flags from `GET /api/feature-flags/` on auth. A `useFeatureFlag(key: string) → boolean` hook SHALL expose the current state of any flag, returning `false` for keys that are unknown or while the initial fetch is pending (fail-closed).

#### Scenario: Flag is enabled

- GIVEN the server returns `vet_management = true`
- WHEN a component calls `useFeatureFlag('vet_management')`
- THEN the return value SHALL be `true`

#### Scenario: Flag is disabled

- GIVEN the server returns `vet_management = false`
- WHEN a component calls `useFeatureFlag('vet_management')`
- THEN the return value SHALL be `false`

#### Scenario: Unknown flag

- GIVEN the server returns a map that does not include `mystery_flag`
- WHEN a component calls `useFeatureFlag('mystery_flag')`
- THEN the return value SHALL be `false`

#### Scenario: Fetch has not completed yet

- GIVEN the provider has mounted but the fetch is still in flight
- WHEN a component calls `useFeatureFlag('vet_management')`
- THEN the return value SHALL be `false` (fail-closed)

### Requirement: Admin Page For Toggling Flags

The system SHALL render an admin-only page at `/admin/feature-flags`. The page SHALL list every flag with its `label`, `key`, `description`, and current `enabled` state, and SHALL let the admin flip the state with a single click.

#### Scenario: Admin lists flags

- GIVEN an authenticated admin
- WHEN they navigate to `/admin/feature-flags`
- THEN the page SHALL render one row per flag received from the API
- AND each row SHALL show the `label`, `key`, and `description`

#### Scenario: Admin toggles a flag

- GIVEN the admin is on `/admin/feature-flags`
- WHEN they click the toggle on `multiday_schedule`
- THEN a `PATCH /api/feature-flags/multiday_schedule/` SHALL be sent with the new `enabled` value
- AND on success the UI SHALL refresh the local map so downstream `useFeatureFlag('multiday_schedule')` calls reflect the change without a full reload

#### Scenario: Non-admin is redirected away

- GIVEN a non-admin authenticated user
- WHEN they navigate to `/admin/feature-flags`
- THEN the `withAdmin` HOC SHALL redirect them away from the page

### Requirement: Gated UI Surfaces

Each of the six canonical flags SHALL gate the following UI surfaces. When the flag is `false`, the listed UI SHALL be hidden; when `true`, it SHALL render as before.

- `multiday_schedule` — the end-date `<input>` in `ScheduleForm` (and the multi-pet version). When off, `end_date` SHALL be forced to equal `start_date` on every change.
- `custom_pet_species` — a free-text species input in `PetForm`. When the flag is ON and the input has a non-empty value, its value SHALL override the dropdown selection in the submitted payload. When the flag is OFF, the input SHALL NOT appear.
- `vet_management` — the "Vets" entry in the profile menu, the veterinary section in `OwnerForm`, the `vet_override` dropdown in `PetForm`.
- `medical_notes` — the `MedicalNotesSection` block in `PetForm`.
- `data_backup` — the `DataBackupSection` card on `/settings`.
- `compatibility_warnings` — the post-create conflict warning banner in `ScheduleForm`.

#### Scenario: Turning off `vet_management` hides every vet-related surface

- GIVEN an admin has toggled `vet_management` off
- WHEN any authenticated user loads the app
- THEN the "Vets" profile-menu entry SHALL NOT appear
- AND the owner form SHALL NOT render its veterinary section
- AND the pet form SHALL NOT render its vet-override dropdown

#### Scenario: Turning off `multiday_schedule` collapses the schedule date range

- GIVEN the admin has toggled `multiday_schedule` off
- WHEN a user opens `ScheduleForm`
- THEN the end-date input SHALL NOT appear
- AND submitting the form SHALL POST `start_date == end_date`
