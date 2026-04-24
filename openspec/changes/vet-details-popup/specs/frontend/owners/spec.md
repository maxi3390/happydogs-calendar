# MODIFIED: Frontend / Owners

## ADDED Requirements

### Requirement: Owner Details Popup Vet References Open Vet Details Popup

When the owner details popup renders the veterinary section (under the `vet_management` feature flag), each vet reference (primary and emergency) SHALL show the vet's **name** (not its id) and SHALL be rendered as an interactive control. Clicking either reference SHALL open the Vet Details popup on top of the owner popup.

The owner payload SHALL therefore expose `primary_vet_details` and `emergency_vet_details` projections (id + name + phone + email + city) alongside the raw `primary_vet` / `emergency_vet` FK ids, so the popup can render meaningful labels without issuing extra requests.

#### Scenario: Clicking the primary vet opens the vet popup

- GIVEN the operator has opened an owner details popup for an owner with `primary_vet` set and `vet_management` is enabled
- WHEN the operator clicks the primary vet reference
- THEN a Vet Details popup SHALL open on top of the owner popup
- AND the Vet Details popup SHALL display the vet's full name, address, contact info, and notes

#### Scenario: Clicking the emergency vet opens the vet popup

- GIVEN the operator has opened an owner details popup for an owner with `emergency_vet` set and `vet_management` is enabled
- WHEN the operator clicks the emergency vet reference
- THEN a Vet Details popup SHALL open on top of the owner popup
- AND the popup SHALL display the emergency vet's record

#### Scenario: Editing the vet from within the owner popup

- GIVEN the Vet Details popup is open (reached from an owner popup)
- WHEN the operator clicks Edit Vet
- THEN the Vet Details popup SHALL close
- AND the `VetForm` SHALL open pre-filled with that vet's data
- AND the owner popup SHALL remain open underneath

#### Scenario: Vet reference missing its nested details projection

- GIVEN a stale payload where `primary_vet` or `emergency_vet` is a number but the corresponding `*_details` field is missing
- WHEN the popup renders the veterinary section
- THEN the system SHALL render the legacy `#<id>` placeholder (non-interactive) for that line so the UI degrades silently

#### Scenario: Owner with neither vet set

- GIVEN an owner whose `primary_vet` and `emergency_vet` are both null
- WHEN the owner details popup is rendered
- THEN the veterinary section SHALL NOT appear
- AND no Vet Details popup SHALL be reachable from this popup
