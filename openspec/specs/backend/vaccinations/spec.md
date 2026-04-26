# Vaccination Tracking Specification

## Purpose

This specification defines the behavior of the vaccination tracking domain within the pet nursery management system. It covers two distinct concepts: **vaccination types** (a configurable catalog of common vaccinations) and **vaccination records** (individual vaccination entries linked to specific pets). Vaccination types serve as a reference list for the user interface, while vaccination records are free-text entries stored directly on each pet, allowing flexibility beyond the predefined catalog.

## Requirements

### Requirement: List Vaccination Types

The system SHALL provide an endpoint to retrieve all vaccination types.

The response MUST include each vaccination type's identifier, name, label, enabled status, and display order.

The list SHOULD be ordered by the `order` field by default.

The endpoint MUST require authentication.

#### Scenario: Successfully listing all vaccination types

- Given an authenticated user exists
- When the user requests the list of vaccination types
- Then the system SHALL return a successful response containing all vaccination types
- And each entry SHALL include its identifier, name, label, enabled status, and display order

#### Scenario: Unauthenticated request to list vaccination types

- Given no authentication credentials are provided
- When a request is made to list vaccination types
- Then the system SHALL reject the request with an authentication error

### Requirement: Create Vaccination Type

The system SHALL provide an endpoint to create a new vaccination type.

A vaccination type MUST have a `name` (a unique internal key), a `label` (a human-readable display name), an `enabled` flag (boolean), and an `order` (integer for display ordering).

The `name` field MUST be unique across all vaccination types.

The endpoint MUST require authentication.

#### Scenario: Successfully creating a vaccination type

- Given an authenticated user exists
- When the user submits a request to create a vaccination type with a valid name, label, enabled status, and order
- Then the system SHALL create the vaccination type
- And the system SHALL return the created vaccination type with its assigned identifier

#### Scenario: Creating a vaccination type with a duplicate name

- Given an authenticated user exists
- And a vaccination type with the name "rabies" already exists
- When the user submits a request to create a vaccination type with the name "rabies"
- Then the system SHALL reject the request with a validation error indicating the name is already in use

#### Scenario: Creating a vaccination type with missing required fields

- Given an authenticated user exists
- When the user submits a request to create a vaccination type without providing a name or label
- Then the system SHALL reject the request with a validation error indicating which fields are required

### Requirement: Retrieve Vaccination Type

The system SHALL provide an endpoint to retrieve a single vaccination type by its identifier.

The endpoint MUST require authentication.

#### Scenario: Successfully retrieving a vaccination type

- Given an authenticated user exists
- And a vaccination type with a known identifier exists
- When the user requests that vaccination type by its identifier
- Then the system SHALL return the vaccination type's full details including identifier, name, label, enabled status, and order

#### Scenario: Retrieving a non-existent vaccination type

- Given an authenticated user exists
- When the user requests a vaccination type with an identifier that does not exist
- Then the system SHALL respond with a not-found error

### Requirement: Update Vaccination Type

The system SHALL provide an endpoint to update an existing vaccination type.

The system MUST allow updating the label, enabled status, and order.

The `name` uniqueness constraint MUST be enforced on update.

The endpoint MUST require authentication.

#### Scenario: Successfully updating a vaccination type

- Given an authenticated user exists
- And a vaccination type with a known identifier exists
- When the user submits a request to update that vaccination type with a new label and order
- Then the system SHALL persist the changes
- And the system SHALL return the updated vaccination type

#### Scenario: Updating a vaccination type name to a duplicate value

- Given an authenticated user exists
- And a vaccination type with the name "rabies" exists
- And a vaccination type with the name "distemper" exists
- When the user submits a request to update the "distemper" vaccination type's name to "rabies"
- Then the system SHALL reject the request with a validation error indicating the name is already in use

#### Scenario: Updating a non-existent vaccination type

- Given an authenticated user exists
- When the user submits a request to update a vaccination type with an identifier that does not exist
- Then the system SHALL respond with a not-found error

### Requirement: Delete Vaccination Type

The system SHALL provide an endpoint to delete a vaccination type by its identifier.

The endpoint MUST require authentication.

#### Scenario: Successfully deleting a vaccination type

- Given an authenticated user exists
- And a vaccination type with a known identifier exists
- When the user submits a request to delete that vaccination type
- Then the system SHALL remove the vaccination type from the system
- And subsequent requests to retrieve that vaccination type SHALL return a not-found error

#### Scenario: Deleting a non-existent vaccination type

- Given an authenticated user exists
- When the user submits a request to delete a vaccination type with an identifier that does not exist
- Then the system SHALL respond with a not-found error

### Requirement: Enable and Disable Vaccination Types

The system SHALL allow vaccination types to be enabled or disabled via the update endpoint.

Disabling a vaccination type MUST NOT delete it from the system.

Disabled vaccination types SHOULD still appear in the list of vaccination types, with their enabled status clearly indicated.

Existing vaccination records that reference a disabled vaccination type's name MUST NOT be affected.

#### Scenario: Disabling a vaccination type

- Given an authenticated user exists
- And a vaccination type with enabled status set to true exists
- When the user updates that vaccination type's enabled status to false
- Then the system SHALL persist the change
- And the vaccination type SHALL appear in the list with enabled status set to false

#### Scenario: Re-enabling a vaccination type

- Given an authenticated user exists
- And a vaccination type with enabled status set to false exists
- When the user updates that vaccination type's enabled status to true
- Then the system SHALL persist the change
- And the vaccination type SHALL appear in the list with enabled status set to true

#### Scenario: Existing pet vaccinations are unaffected by disabling a type

- Given a pet has a vaccination record with vax_type "rabies"
- And the vaccination type with name "rabies" is disabled
- When the pet's details are retrieved
- Then the vaccination record with vax_type "rabies" SHALL still be present and unchanged

### Requirement: Manage Vaccination Records on Pets

Vaccination records SHALL be managed as nested resources within pet creation and update operations.

Each vaccination record MUST include a `vax_type` (a free-text string) and a `date`.

The `vax_type` field MUST NOT be a foreign key reference to a vaccination type; it SHALL be stored as a plain string value.

The endpoint MUST require authentication.

#### Scenario: Creating a pet with vaccination records

- Given an authenticated user exists
- When the user creates a new pet and includes a list of vaccination records, each with a vax_type and date
- Then the system SHALL create the pet along with all provided vaccination records
- And each vaccination record SHALL be linked to the newly created pet

#### Scenario: Creating a pet with a vaccination using a free-text vax_type

- Given an authenticated user exists
- And no vaccination type with the name "custom_vaccine" exists in the vaccination types catalog
- When the user creates a pet with a vaccination record having vax_type "custom_vaccine" and a valid date
- Then the system SHALL accept the vaccination record without error
- And the vaccination record SHALL be stored with vax_type "custom_vaccine"

#### Scenario: Creating a pet with vaccination records missing required fields

- Given an authenticated user exists
- When the user creates a pet with a vaccination record that is missing the date field
- Then the system SHALL reject the request with a validation error indicating the date is required

### Requirement: Atomic Replacement of Vaccination Records on Pet Update

When a pet is updated with vaccination records, the system SHALL replace all existing vaccination records for that pet atomically.

The system MUST NOT perform incremental additions or removals of individual vaccination records.

All previously existing vaccination records for that pet SHALL be removed, and the new set SHALL be stored in their place.

#### Scenario: Replacing all vaccinations on pet update

- Given an authenticated user exists
- And a pet exists with two vaccination records: "rabies" dated 2024-01-01 and "distemper" dated 2024-02-01
- When the user updates the pet with a single vaccination record: "parvovirus" dated 2024-03-01
- Then the system SHALL remove both previous vaccination records
- And the pet SHALL have exactly one vaccination record: "parvovirus" dated 2024-03-01

#### Scenario: Clearing all vaccinations on pet update

- Given an authenticated user exists
- And a pet exists with vaccination records
- When the user updates the pet with an empty list of vaccination records
- Then the system SHALL remove all existing vaccination records for that pet
- And the pet SHALL have zero vaccination records

#### Scenario: Updating a pet without providing vaccination data

- Given an authenticated user exists
- And a pet exists with vaccination records
- When the user updates other fields of the pet without including vaccination data in the request
- Then the existing vaccination records SHOULD remain unchanged

### Requirement: VaccinationType SHALL carry a per-type `due_after_days` cadence

`VaccinationType` SHALL expose a `due_after_days` field — a `PositiveIntegerField` (default `365`) representing how many days after a vaccination of that type before the next one is considered due. The value is consulted by the notification system's `generate_notifications` command to decide when to fire `vaccination_due` notifications.

A value of `0` SHALL mean "non-recurring" — vaccinations of that type SHALL never produce a `vaccination_due` notification regardless of how old they are. This is the explicit opt-out for one-off vaccinations administered at intake.

The field SHALL be exposed in the `VaccinationType` REST endpoints (read on list / detail, write on create / update) and editable via the Settings UI.

#### Scenario: Default cadence is 365 days

- GIVEN a fresh deployment with the seeded vaccination types
- WHEN an operator inspects them
- THEN every type's `due_after_days` SHALL be `365`

#### Scenario: Per-type override

- GIVEN an operator sets the rabies vaccination type's `due_after_days` to `1095` (3 years)
- AND a pet has a rabies vaccination dated 366 days ago
- WHEN the notification cron runs
- THEN no `vaccination_due` notification SHALL fire for that pet's rabies record (the per-type cadence overrides the default)

#### Scenario: Non-recurring vaccination

- GIVEN a vaccination type's `due_after_days` is `0`
- AND a pet has a vaccination of that type dated several years ago
- WHEN the notification cron runs
- THEN no `vaccination_due` notification SHALL fire for that pet's vaccination, ever
