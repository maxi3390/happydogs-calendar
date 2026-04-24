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

### Requirement: Pet List Accordion Surfaces Emergency Vet Information

The expanded pet card on `/pets` SHALL display a Veterinary block with the pet's effective vet and the owner's emergency vet. The block SHALL be rendered when the `vet_management` feature flag is enabled and at least one of the two vet projections is non-null. Each vet row SHALL show the vet's name as an interactive control that opens the Vet Details popup, with the vet's phone number rendered inline next to the name so an emergency call does not require opening the popup.

The pet payload SHALL therefore expose `effective_vet_details` and `emergency_vet_details` compact projections (id + name + phone + email + city) so the list can render this block without issuing extra requests. A single `VetDetailsPopup` + `VetForm` pair is owned by the list component itself and shared across all expanded rows — only one vet surface can be open at a time.

#### Scenario: Expanded pet card shows the effective vet and the emergency vet

- GIVEN the operator has expanded a pet card on `/pets`
- AND the `vet_management` flag is enabled
- AND the pet has `effective_vet_details` = "Happy Paws" (phone "555-1001")
- AND `emergency_vet_details` = "Nightline" (phone "555-9911")
- WHEN the accordion content is rendered
- THEN a Veterinary block SHALL be visible
- AND it SHALL show "Happy Paws · 555-1001" and "Nightline · 555-9911" on separate rows
- AND both vet names SHALL be rendered as interactive controls

#### Scenario: Clicking a vet row from the list opens the vet popup

- GIVEN the operator is looking at an expanded pet card with a visible Veterinary block
- WHEN the operator clicks one of the vet-name controls
- THEN a Vet Details popup SHALL open on top of the pet list
- AND closing the popup SHALL return the operator to the same expanded card with no state loss

#### Scenario: Pet with only an effective vet

- GIVEN an expanded pet card whose `effective_vet_details` is populated but whose `emergency_vet_details` is null
- WHEN the accordion content is rendered
- THEN the Veterinary block SHALL show only the effective-vet row
- AND no placeholder row SHALL be rendered for the missing emergency vet

#### Scenario: Pet with no resolvable vet hides the Veterinary block

- GIVEN an expanded pet card whose `effective_vet_details` and `emergency_vet_details` are both null
- WHEN the accordion content is rendered
- THEN no Veterinary block SHALL appear

#### Scenario: Feature flag disabled hides the Veterinary block

- GIVEN the `vet_management` flag is disabled
- WHEN any pet card is expanded
- THEN no Veterinary block SHALL appear regardless of the pet's vet fields

#### Scenario: Vet row without a recorded phone renders a muted filler

- GIVEN a vet with no `phone` recorded
- WHEN its row is rendered in the pet list Veterinary block
- THEN the phone slot SHALL show a muted filler from `vet.noPhone` rather than an empty string
- AND the vet name SHALL remain an interactive control pointing at the Vet Details popup
