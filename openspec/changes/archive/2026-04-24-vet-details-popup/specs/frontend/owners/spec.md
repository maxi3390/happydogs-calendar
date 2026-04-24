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

### Requirement: Owner List Accordion Surfaces Emergency Vet Information

The expanded owner card on `/owners` SHALL display a Veterinary block with the owner's primary and emergency vets. The block SHALL be rendered when the `vet_management` feature flag is enabled and at least one of `primary_vet_details` or `emergency_vet_details` is non-null. Each vet row SHALL show the vet's name as an interactive control that opens the Vet Details popup, with the vet's phone number rendered inline next to the name so an emergency call does not require opening the popup.

A single `VetDetailsPopup` + `VetForm` pair is owned by the owners page and shared across all expanded rows — only one vet surface can be open at a time.

#### Scenario: Expanded owner card shows both vets

- GIVEN the operator has expanded an owner card on `/owners`
- AND the `vet_management` flag is enabled
- AND the owner has `primary_vet_details` = "Happy Paws" (phone "555-1001")
- AND `emergency_vet_details` = "Nightline" (phone "555-9911")
- WHEN the accordion content is rendered
- THEN a Veterinary block SHALL be visible between the owner's notes and the Pets section
- AND it SHALL show "Happy Paws · 555-1001" and "Nightline · 555-9911" on separate rows
- AND both vet names SHALL be rendered as interactive controls

#### Scenario: Clicking a vet row from the owners list opens the vet popup

- GIVEN the operator is looking at an expanded owner card with a visible Veterinary block
- WHEN the operator clicks one of the vet-name controls
- THEN a Vet Details popup SHALL open on top of the owners list
- AND closing the popup SHALL return the operator to the same expanded card with no state loss

#### Scenario: Owner with only one vet set

- GIVEN an expanded owner card whose `primary_vet_details` is populated but whose `emergency_vet_details` is null
- WHEN the accordion content is rendered
- THEN the Veterinary block SHALL show only the primary-vet row
- AND no placeholder row SHALL be rendered for the missing emergency vet

#### Scenario: Owner with neither vet set hides the block

- GIVEN an expanded owner card whose `primary_vet_details` and `emergency_vet_details` are both null
- WHEN the accordion content is rendered
- THEN no Veterinary block SHALL appear

#### Scenario: Feature flag disabled hides the block

- GIVEN the `vet_management` flag is disabled
- WHEN any owner card is expanded
- THEN no Veterinary block SHALL appear regardless of the owner's vet fields

#### Scenario: Vet row without a recorded phone renders a muted filler

- GIVEN a vet with no `phone` recorded
- WHEN its row is rendered in the owner list Veterinary block
- THEN the phone slot SHALL show a muted filler from `vet.noPhone` rather than an empty string
- AND the vet name SHALL remain an interactive control pointing at the Vet Details popup
