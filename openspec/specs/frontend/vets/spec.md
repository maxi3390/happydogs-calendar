# Frontend Vet Management Specification

## Purpose

Define the behavior of the vet management interface: the `/vets` page, the vet form, integration of vet references into the owner and pet forms, and the navigation entry that exposes all of it.

## Requirements

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

The "Vets" link SHALL live inside the authenticated user's profile menu rather than the primary navigation bar, on both the desktop and mobile breakpoints. This keeps the primary nav focused on owner / pet / calendar flows that operators reach dozens of times per day, while vet management (create, edit, delete clinics) is a lower-frequency operation colocated with settings and admin tools.

#### Scenario: Desktop profile popup

- GIVEN an authenticated staff user on the desktop breakpoint
- WHEN the user opens the profile popup (by clicking the avatar button in the top-right)
- THEN a "Vets" menu item pointing to `/vets` SHALL appear above "Settings"

#### Scenario: Mobile profile section

- GIVEN an authenticated staff user on the mobile breakpoint
- WHEN the user opens the hamburger menu and scrolls to the profile section
- THEN a "Vets" link pointing to `/vets` SHALL appear above "Settings" inside that section
- AND SHALL NOT appear in the primary mobile navigation list (Calendar / Owners / Pets)

### Requirement: Vet Form UI

The vet form SHALL collect `name` (required), `phone`, `email`, the five structured address fields (`street`, `city`, `state`, `province`, `country`), and `notes`.

#### Scenario: Validation

- GIVEN the operator submits the vet form with a blank `name`
- THEN the form SHALL display an error and SHALL NOT POST to the API

### Requirement: Vet Details Popup

The system SHALL provide a read-only `VetDetailsPopup` modal that operators can open to preview a vet record and hand off to the existing `VetForm` for edits. The popup SHALL be the surface opened whenever any other popup (Pet Details, Owner Details) or list accordion (PetList, /owners page) exposes a click target that references a vet.

#### Scenario: Opening the popup

- GIVEN the operator has a vet reference rendered as a click target in any parent popup or list accordion
- WHEN the operator clicks the reference
- THEN the system SHALL fetch the vet via `api.vets.get(id)` and render it inside a modal dialog on top of the parent surface
- AND the dialog SHALL display the vet's name, full address summary (when any address field is set), phone, email, and free-form notes

#### Scenario: Loading state

- GIVEN the popup has just been opened
- WHEN the fetch request is in flight
- THEN the system SHALL render a loading indicator inside the dialog
- AND SHALL disable the Edit button until the vet is hydrated

#### Scenario: Edit handoff

- GIVEN the popup is open on a hydrated vet
- WHEN the operator clicks Edit Vet
- THEN the vet popup SHALL close
- AND the existing `VetForm` SHALL open pre-filled with that vet's data

#### Scenario: Closing the popup

- GIVEN the popup is open
- WHEN the operator clicks the backdrop, the close button, or presses Escape
- THEN the popup SHALL close
- AND the parent surface (pet/owner details popup or list accordion) SHALL remain in its previous state underneath

#### Scenario: Accessibility

- GIVEN the popup opens
- THEN focus SHALL move to the close button
- AND the dialog SHALL expose `role="dialog"` with an `aria-modal` attribute and a labelled title
