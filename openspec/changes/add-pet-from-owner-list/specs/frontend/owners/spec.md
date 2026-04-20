# Delta for Frontend Owners

## ADDED Requirements

### Requirement: Add Pet From Owner Card

The system SHALL allow users to create a new pet directly from an expanded owner card. The pet form SHALL open with the owner pre-selected and locked, and the owner's pet list and pet count SHALL refresh after a pet is saved.

#### Scenario: Add Pet action visible in expanded owner card

- Given an owner card is expanded on the /owners page
- When the expanded section renders
- Then the system SHALL display an "Add Pet" control near the "Pets (N)" section header

#### Scenario: Opening the pet form from an owner card

- Given an owner card is expanded
- When the user activates the owner's "Add Pet" action
- Then the system SHALL open the pet form modal
- And the pet form SHALL be in create mode
- And the pet form SHALL have the owner pre-selected and locked to that owner
- And the pet form SHALL NOT display the owner selector

#### Scenario: Refreshing after saving a pet

- Given the user opened the pet form from an owner card and saved a pet via "Save"
- When the pet form closes
- Then the expanded owner card SHALL re-fetch and display the updated list of pets for that owner
- And the owner summary SHALL reflect the updated pet count

#### Scenario: Refreshing after save-and-add-another

- Given the user opened the pet form from an owner card and activated "Save & Add Another"
- When the save succeeds
- Then the expanded owner card SHALL re-fetch and display the updated list of pets for that owner
- And the owner summary SHALL reflect the updated pet count
- And the pet form modal SHALL remain open for another pet creation

#### Scenario: Cancelling without saving

- Given the user opened the pet form from an owner card
- When the user cancels or closes the modal without saving
- Then the expanded owner card SHALL remain unchanged
- And the owner's pet list and pet count SHALL NOT change
