# MODIFIED: Frontend / Pets

## ADDED Requirements

### Requirement: Pet Accordion Owner Reference Opens Owner Details Popup

When a pet card in the pet list accordion is expanded, the owner name line SHALL be rendered as an interactive control. Clicking it SHALL open an Owner Details popup showing a read-only view of the owner and an Edit button that hands off to the Owner form.

The popup SHALL fetch the owner freshly via `api.owners.get(id)` on mount, independently of the light `owner_details` payload embedded in the pet card, so the preview always reflects the latest state of the owner.

#### Scenario: Clicking the owner reference opens the popup

- GIVEN the operator has expanded a pet card that has an owner
- WHEN the operator clicks the owner name
- THEN an Owner Details popup SHALL open
- AND the popup SHALL display the owner's full name, contact info, and (when `vet_management` is on) the owner's primary / emergency vet names

#### Scenario: Editing the owner from the popup

- GIVEN the Owner Details popup is open
- WHEN the operator clicks the Edit Owner button
- THEN the popup SHALL close
- AND the Owner form SHALL open pre-filled with that owner's data
- AND saving the form SHALL refresh the pet list so the pet's owner reference reflects any updated name

#### Scenario: Pet without an owner

- GIVEN a pet record whose `owner_details` is null
- WHEN the operator expands the pet card
- THEN the owner line SHALL NOT be an interactive control (no popup to open)

#### Scenario: Closing the popup

- GIVEN the Owner Details popup is open
- WHEN the operator clicks the backdrop, the close button, or presses Escape
- THEN the popup SHALL close
- AND the underlying pet list and accordion state SHALL NOT be affected
