# Delta for Frontend Pets

## MODIFIED Requirements

### Requirement: Pet Form - General Fields

The system SHALL present a modal form for creating and editing pets. When the form is opened with a locked owner (from the owner list entry point), the owner is pre-selected and the owner selector is not shown. When the form is opened without a locked owner (edit mode), the pet's existing owner is used. An owner-less creation path is not supported.

#### Scenario: Opening the create pet form with a locked owner

- Given the user opens the pet creation form from an owner's "Add Pet" action
- When the form modal opens
- Then the owner SHALL be pre-selected to that owner
- And the owner selector SHALL NOT be displayed
- And the owner-selection helper hint SHALL NOT be displayed
- And all form fields SHALL be enabled (no gating, since an owner is present)

#### Scenario: Opening the edit pet form

- Given the user activates the edit action for a pet
- When the form modal opens
- Then all fields SHALL be pre-filled with the pet's current data
- And the owner selector SHALL be displayed pre-filled with the pet's current owner (existing behavior)
- And all fields SHALL be enabled

#### Scenario: Required fields validation

- Given the user is filling in the pet form
- When the user attempts to submit with any required field empty (name, species, age, temperament, size, sex)
- Then the system SHALL prevent submission
- And the system SHALL indicate which required fields are missing

#### Scenario: Species selection

- Given the pet form is active
- When the user interacts with the species field
- Then the system SHALL present a dropdown of available species options

#### Scenario: Temperament selection

- Given the pet form is active
- When the user interacts with the temperament field
- Then the system SHALL present a dropdown of available temperament options

#### Scenario: Size selection

- Given the pet form is active
- When the user interacts with the size field
- Then the system SHALL present a dropdown of available size options

#### Scenario: Sex selection

- Given the pet form is active
- When the user interacts with the sex field
- Then the system SHALL present a dropdown of available sex options

#### Scenario: Dominance slider

- Given the pet form is active
- When the user interacts with the dominance field
- Then the system SHALL present a slider allowing selection of a value from 1 to 10
- And the slider SHALL display a color indicator: green for values 1-3, yellow for values 4-6, and red for values 7-10

#### Scenario: Birth date auto-calculates age

- Given the pet form is active
- When the user enters or changes the birth date
- Then the system SHALL automatically calculate and update the age field based on the difference between the birth date and today

#### Scenario: Weight field

- Given the pet form is active
- When the user enters a weight value
- Then the system SHALL accept a numeric value in kilograms

#### Scenario: Neutered checkbox

- Given the pet form is active
- When the user interacts with the neutered field
- Then the system SHALL present a checkbox that can be toggled on or off

#### Scenario: Breed field (optional)

- Given the pet form is active
- When the user views the breed field
- Then the field SHALL be available but not required

#### Scenario: Special notes textarea

- Given the pet form is active
- When the user enters text in the special notes field
- Then the system SHALL accept multi-line free-text input

---

### Requirement: Pet Form - Submission

The system SHALL handle form submission for creating and editing pets, with a dedicated "Save & Add Another" fast-path for consecutive pet creation under the same owner.

#### Scenario: Successful pet creation

- Given the user has filled in all required fields in create mode
- When the user activates the "Save" action
- Then the system SHALL send the pet data to the backend
- And upon success, the form modal SHALL close
- And the system SHALL display a success toast containing the created pet's name

#### Scenario: Successful pet edit

- Given the user has modified fields in edit mode
- When the user submits the form
- Then the system SHALL send the updated pet data to the backend
- And upon success, the form modal SHALL close

#### Scenario: Save and add another

- Given the user is in create mode with a locked owner
- When the user activates the "Save & Add Another" action and the save succeeds
- Then the form modal SHALL remain open
- And the form fields SHALL be reset to defaults, keeping the same locked owner
- And the vaccination rows SHALL be cleared
- And the pending profile picture SHALL be cleared
- And the system SHALL display a success toast containing the created pet's name

#### Scenario: Save and add another is only available in create mode

- Given the user opens the pet form in edit mode
- When the form renders
- Then the "Save & Add Another" action SHALL NOT be displayed

#### Scenario: Submission error

- Given the user submits the pet form (either button)
- When the backend returns an error
- Then the system SHALL display an error message within the form
- And the form SHALL remain open so the user can correct the issue
- And no success toast SHALL be displayed

#### Scenario: Loading state during submission

- Given the user submits the pet form
- When the request is in progress
- Then both submit buttons SHALL display a loading indicator or be disabled to prevent duplicate submissions

## REMOVED Requirements

### Requirement: Pet Form - Profile Picture Upload (owner-selection gating)

**Reason**: With the locked-owner entry point, the owner is always pre-selected or already assigned in edit mode, so the legacy "gate all other fields behind owner selection" behavior is no longer reachable. The gating scenarios are subsumed by the new scenarios in "Pet Form - General Fields".

**Migration**: Consumers of `PetForm` SHOULD pass `lockedOwnerId` when opening the form for creation; edit mode uses the pet's existing owner automatically. There is no public flow that opens the form without either.
