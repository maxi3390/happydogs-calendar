# MODIFIED: Frontend / Settings

## MODIFIED Requirements

### Requirement: Pet incompatibility rules SHALL be persisted server-side

The Settings page SHALL list, create, update, and delete custom pet-incompatibility rules through the `/api/pet-incompatibilities/` REST endpoints — NOT through `localStorage`. The previous `pet_incompatibilities` localStorage key SHALL no longer be read or written by the application.

The Settings page SHALL display a one-time informational banner stating that rules are now stored centrally and that any rules saved before the change in a single browser need to be re-entered. The banner SHALL be dismissible (per-user, persisted via localStorage so it doesn't recur).

#### Scenario: Loading the Settings page

- WHEN an authenticated user opens `/settings`
- THEN the Incompatibilities section SHALL fetch its rows from `/api/pet-incompatibilities/`
- AND no read of `localStorage['pet_incompatibilities']` SHALL occur

#### Scenario: Creating a rule

- GIVEN the user has selected two distinct pets and entered a reason
- WHEN they submit the rule
- THEN a POST to `/api/pet-incompatibilities/` SHALL be issued
- AND the new rule SHALL appear in the list on success
- AND no write to `localStorage['pet_incompatibilities']` SHALL occur

#### Scenario: Editing a rule's reason

- GIVEN an existing rule
- WHEN the user changes the `reason` and submits
- THEN a PATCH to `/api/pet-incompatibilities/{id}/` SHALL be issued
- AND the new reason SHALL appear in the list

#### Scenario: Deleting a rule

- GIVEN an existing rule
- WHEN the user activates the delete control and confirms
- THEN a DELETE to `/api/pet-incompatibilities/{id}/` SHALL be issued
- AND the rule SHALL be removed from the list

#### Scenario: Migration banner

- WHEN an authenticated user opens `/settings` for the first time after the upgrade
- THEN a one-time informational banner SHALL display, explaining that previously-local rules need re-entry
- AND the banner SHALL be dismissible
- AND a dismissed banner SHALL NOT reappear on subsequent visits in the same browser
