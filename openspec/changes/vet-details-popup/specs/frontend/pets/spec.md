# MODIFIED: Frontend / Pets

## ADDED Requirements

### Requirement: Pet Details Popup Vet Reference Opens Vet Details Popup

When the pet details popup renders the vet override section (under the `vet_management` feature flag), the reference SHALL show the vet's **name** (not its id) and SHALL be rendered as an interactive control. Clicking it SHALL open the Vet Details popup on top of the pet popup.

The pet payload SHALL therefore expose a `vet_override_details` projection (id + name + phone + email + city) alongside the raw `vet_override` FK id, so the popup can render a meaningful label without issuing a second request.

#### Scenario: Clicking the vet override opens the vet popup

- GIVEN the operator has opened a pet details popup for a pet with `vet_override` set and `vet_management` is enabled
- WHEN the operator clicks the vet override reference
- THEN a Vet Details popup SHALL open on top of the pet popup
- AND the Vet Details popup SHALL display the vet's full name, address, contact info, and notes

#### Scenario: Editing the vet from within the pet popup

- GIVEN the Vet Details popup is open (reached from a pet popup)
- WHEN the operator clicks Edit Vet
- THEN the Vet Details popup SHALL close
- AND the `VetForm` SHALL open pre-filled with that vet's data
- AND the pet popup SHALL remain open underneath so the operator can return to it after saving

#### Scenario: Vet override missing its nested details projection

- GIVEN a stale payload where `vet_override` is a number but `vet_override_details` is missing
- WHEN the popup renders the vet section
- THEN the system SHALL render the legacy `#<id>` placeholder (non-interactive) so the UI degrades silently rather than crashing

#### Scenario: Pet without a vet override

- GIVEN a pet whose `vet_override` is null
- WHEN the pet details popup is rendered
- THEN the vet override section SHALL NOT appear
- AND no Vet Details popup SHALL be reachable from this popup
