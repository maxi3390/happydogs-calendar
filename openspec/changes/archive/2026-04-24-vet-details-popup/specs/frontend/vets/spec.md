# ADDED: Frontend / Vets

## ADDED Requirements

### Requirement: Vet Details Popup

The system SHALL provide a read-only `VetDetailsPopup` modal that operators can open to preview a vet record and hand off to the existing `VetForm` for edits. The popup SHALL be the surface opened whenever any other popup (Pet Details, Owner Details) exposes a click target that references a vet.

#### Scenario: Opening the popup

- GIVEN the operator has a vet reference rendered as a click target in any parent popup
- WHEN the operator clicks the reference
- THEN the system SHALL fetch the vet via `api.vets.get(id)` and render it inside a modal dialog on top of the parent popup
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
- AND the parent popup (pet or owner details) SHALL remain open underneath

#### Scenario: Accessibility

- GIVEN the popup opens
- THEN focus SHALL move to the close button
- AND the dialog SHALL expose `role="dialog"` with an `aria-modal` attribute and a labelled title
