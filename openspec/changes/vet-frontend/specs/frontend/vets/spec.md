# ADDED: Frontend / Vets

## ADDED Requirements

### Requirement: Vet Management Page

The system SHALL provide a dedicated `/vets` page that lists all registered vets and lets authenticated staff add, edit, and delete them.

#### Scenario: Rendering the vet list

- GIVEN the operator is authenticated
- WHEN the operator navigates to `/vets`
- THEN the system SHALL render one card per vet with the vet's name, a one-line address summary, and contact chips (phone / email when present)
- AND SHALL show an "Add Vet" button in the page header

#### Scenario: Empty state

- GIVEN no vets exist
- WHEN the operator navigates to `/vets`
- THEN the system SHALL show an empty-state message with a call-to-action to add the first vet

#### Scenario: Searching

- GIVEN the vet list is rendered
- WHEN the operator types a term in the search box
- THEN the system SHALL filter the list to vets whose `name`, `email`, or `city` contains the term (case-insensitive)

#### Scenario: Creating a vet

- GIVEN the operator clicks "Add Vet"
- WHEN the operator submits the form with at least the required `name` field
- THEN the system SHALL POST to `/api/vets/` and re-render the list with the new vet

#### Scenario: Editing a vet

- GIVEN the operator clicks the edit icon on a vet card
- WHEN the operator submits the form with modified fields
- THEN the system SHALL PATCH the vet's record and reflect the change on the list

#### Scenario: Deleting a vet

- GIVEN the operator clicks the delete icon on a vet card
- WHEN the operator confirms the deletion in the native confirm dialog
- THEN the system SHALL DELETE the vet record and remove it from the list
- AND any owner or pet that referenced the vet SHALL have its `primary_vet` / `emergency_vet` / `vet_override` field nulled (enforced server-side by the model's `SET_NULL` on_delete).

### Requirement: Navigation Entry

The main navigation bar SHALL include a "Vets" link on both the desktop and mobile breakpoints.

#### Scenario: Visibility for authenticated staff

- GIVEN an authenticated staff user
- WHEN the navigation bar renders
- THEN a "Vets" link pointing to `/vets` SHALL be visible in the primary nav group and in the mobile sheet

### Requirement: Vet Form UI

The vet form SHALL collect `name` (required), `phone`, `email`, the five structured address fields (`street`, `city`, `state`, `province`, `country`), and `notes`.

#### Scenario: Validation

- GIVEN the operator submits the vet form with a blank `name`
- THEN the form SHALL display an error and SHALL NOT POST to the API
