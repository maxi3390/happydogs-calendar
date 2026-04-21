# Frontend Pet Management Specification

## Purpose

Define the behavior of the pet management interface, including the pet list display, pet detail cards, and the pet creation/editing form. This specification covers listing, viewing details, creating, editing, and deleting pets, as well as managing vaccinations, profile pictures, medical notes, documents, and special notes.

## Requirements

### Requirement: Pet List

The system SHALL display a list of pets as cards, each summarizing key pet information with the ability to expand for additional details.

#### Scenario: Rendering pet cards

- Given pets exist in the system
- When the pet list loads
- Then the system SHALL display one card per pet
- And each card SHALL show the pet's profile picture, or a species-specific icon if no profile picture exists
- And each card SHALL show the pet's name, breed, species, age, and owner name

#### Scenario: Displaying medical notes count badge

- Given a pet has one or more medical notes
- When the pet card is rendered
- Then the card SHALL display a badge indicating the count of medical notes

#### Scenario: Pet with no medical notes

- Given a pet has no medical notes
- When the pet card is rendered
- Then no medical notes badge SHALL be displayed (or the badge SHALL show zero)

#### Scenario: Expanding a pet card

- Given a pet card is displayed in the list
- When the user activates the card's expand control (accordion toggle)
- Then the card SHALL expand to reveal additional details
- And the expanded section SHALL display a larger profile picture (or species icon)
- And the expanded section SHALL display trait badges for temperament, dominance level, and size
- And the expanded section SHALL display an information grid showing sex, neutered status, and owner
- And the expanded section SHALL display any special notes
- And the expanded section SHALL provide edit and delete action controls

#### Scenario: Collapsing an expanded pet card

- Given a pet card is expanded
- When the user activates the collapse control
- Then the expanded section SHALL be hidden
- And the card SHALL return to its collapsed summary state

#### Scenario: Deleting a pet from the expanded card

- Given a pet card is expanded and the delete action is visible
- When the user activates the delete action
- Then the system SHALL display a confirmation dialog
- And if the user confirms, the system SHALL delete the pet
- And the pet card SHALL be removed from the list
- And if the user cancels, the pet SHALL remain unchanged

#### Scenario: Editing a pet from the expanded card

- Given a pet card is expanded and the edit action is visible
- When the user activates the edit action
- Then the system SHALL open the pet form modal pre-filled with the pet's current data

#### Scenario: Empty state when no pets exist

- Given no pets exist in the system
- When the pet list loads
- Then the system SHALL display a message indicating that no pets have been added yet
- And the system SHOULD provide a call-to-action to create the first pet

#### Scenario: Loading state

- Given the pet list is fetching data
- When the list is in a loading state
- Then the system SHALL display skeleton placeholders in the shape of pet cards
- And the skeletons SHALL indicate that content is loading

---

### Requirement: Pet Form - General Fields

The system SHALL present a modal form for creating and editing pets, with the owner selection gating all other fields.

#### Scenario: Opening the create pet form

- Given the user activates the "add pet" action
- When the form modal opens
- Then all fields SHALL be empty
- And the owner selection field SHALL be enabled
- And all other fields SHALL be disabled until an owner is selected

#### Scenario: Owner selection gates other fields

- Given the pet form modal is open and no owner is selected
- When the user views the form
- Then all fields except the owner selection SHALL be disabled or visually indicated as unavailable
- When the user selects an owner
- Then all other form fields SHALL become enabled

#### Scenario: Required fields validation

- Given the user has selected an owner and is filling in the pet form
- When the user attempts to submit with any required field empty (name, species, age, temperament, size, sex)
- Then the system SHALL prevent submission
- And the system SHALL indicate which required fields are missing

#### Scenario: Species selection

- Given the pet form is active (owner selected)
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

### Requirement: Pet Form - Vaccination Management

The system SHALL provide a dynamic vaccination list within the pet form, allowing users to add and remove vaccination records.

#### Scenario: Adding a vaccination entry

- Given the pet form is active
- When the user activates the "add vaccination" control
- Then the system SHALL add a new vaccination row to the list
- And the new row SHALL include a vaccination type dropdown and a date input

#### Scenario: Vaccination type dropdown filtering

- Given a vaccination row is displayed
- When the user interacts with the vaccination type dropdown
- Then the system SHALL display only vaccination types that are enabled in the system

#### Scenario: Setting a vaccination date

- Given a vaccination row is displayed
- When the user interacts with the date input for that vaccination
- Then the system SHALL allow the user to select or enter a date

#### Scenario: Removing a vaccination entry

- Given one or more vaccination rows are displayed
- When the user activates the remove control on a specific vaccination row
- Then that vaccination row SHALL be removed from the list

#### Scenario: Submitting with vaccinations

- Given the user has added one or more vaccination entries with valid type and date
- When the user submits the pet form
- Then the vaccination records SHALL be included in the submission

#### Scenario: Empty vaccination list

- Given no vaccination entries have been added
- When the user views the vaccination section
- Then the system SHOULD display a message or empty state indicating no vaccinations have been recorded

---

### Requirement: Pet Form - Profile Picture Upload

The system SHALL allow users to upload a profile picture for a pet, but only when editing an existing pet.

#### Scenario: Profile picture upload is available in edit mode

- Given the user is editing an existing pet
- When the form renders
- Then the system SHALL display a profile picture upload control
- And the current profile picture (if any) SHALL be displayed as a preview

#### Scenario: Profile picture upload is not available in create mode

- Given the user is creating a new pet
- When the form renders
- Then the profile picture upload control SHALL NOT be displayed

#### Scenario: Uploading a valid profile picture

- Given the user is editing a pet and the upload control is visible
- When the user selects a file that is a JPEG, PNG, GIF, or WebP image and is 5 MB or smaller
- Then the system SHALL accept the file
- And the system SHALL display a preview of the selected image

#### Scenario: Uploading a file exceeding the size limit

- Given the user is editing a pet
- When the user selects a file larger than 5 MB
- Then the system SHALL reject the file
- And the system SHALL display an error message indicating the maximum file size

#### Scenario: Uploading an invalid file type

- Given the user is editing a pet
- When the user selects a file that is not a JPEG, PNG, GIF, or WebP image
- Then the system SHALL reject the file
- And the system SHALL display an error message indicating the accepted file formats

---

### Requirement: Pet Form - Medical Notes

The system SHALL provide a medical notes section within the pet form, available only when editing an existing pet.

#### Scenario: Medical notes section in edit mode

- Given the user is editing an existing pet
- When the form renders
- Then the system SHALL display a medical notes section
- And any existing medical notes SHALL be listed

#### Scenario: Medical notes section hidden in create mode

- Given the user is creating a new pet
- When the form renders
- Then the medical notes section SHALL NOT be displayed

---

### Requirement: Pet Form - Document Upload

The system SHALL provide a document upload section within the pet form, available only when editing an existing pet.

#### Scenario: Document upload in edit mode

- Given the user is editing an existing pet
- When the form renders
- Then the system SHALL display a document upload control

#### Scenario: Document upload hidden in create mode

- Given the user is creating a new pet
- When the form renders
- Then the document upload control SHALL NOT be displayed

---

### Requirement: Pet Form - Submission

The system SHALL handle form submission for both creating and editing pets.

#### Scenario: Successful pet creation

- Given the user has filled in all required fields in create mode
- When the user submits the form
- Then the system SHALL send the pet data to the backend
- And upon success, the form modal SHALL close
- And the new pet SHALL appear in the pet list

#### Scenario: Successful pet edit

- Given the user has modified fields in edit mode
- When the user submits the form
- Then the system SHALL send the updated pet data to the backend
- And upon success, the form modal SHALL close
- And the pet's card in the list SHALL reflect the updated information

#### Scenario: Submission error

- Given the user submits the pet form
- When the backend returns an error
- Then the system SHALL display an error message within the form
- And the form SHALL remain open so the user can correct the issue

#### Scenario: Loading state during submission

- Given the user submits the pet form
- When the request is in progress
- Then the submit button SHALL display a loading indicator
- And the submit button SHALL be disabled to prevent duplicate submissions

#### Scenario: Opening the edit form pre-fills existing data

- Given the user activates the edit action for a pet
- When the form modal opens
- Then all fields SHALL be pre-filled with the pet's current data
- And the owner field SHALL reflect the pet's current owner
- And all fields SHALL be enabled (since an owner is already assigned)

### Requirement: Pet Vet Override Dropdown

The Pet form SHALL surface an optional `vet_override` dropdown populated from `/api/vets/` and backed by the `Pet.vet_override` FK. A short hint SHALL explain that the field is optional and that the effective vet resolves to the per-pet override first, then the owner's primary vet, then nothing.

#### Scenario: Setting an override

- GIVEN the operator is creating or editing a pet
- WHEN the operator selects a vet from the override dropdown and saves
- THEN the POST / PATCH payload SHALL include `vet_override` as a numeric FK id

#### Scenario: Clearing an override

- GIVEN a pet has a `vet_override` set
- WHEN the operator selects the blank option and saves
- THEN the field SHALL be persisted as `null` server-side
- AND the pet's effective vet SHALL fall back to the owner's `primary_vet` (as defined in the backend spec)

#### Scenario: Hint wording

- GIVEN the pet form is rendered
- THEN the hint next to the `vet_override` field SHALL mention the resolution order (override → owner primary → none)

### Requirement: Pet Weight Input Uses Calculator-Style Entry

The Pet form SHALL render the `weight` field as a fixed-format `NN.NN` kilograms input whose digits build up from the right. Keystrokes shift existing digits left; `Backspace` and `Delete` shift them right. The displayed string grows past two integer digits only when the value itself grows past `99.99`.

The component SHALL clamp at the backend limit of `9999.99` kg (matching `DecimalField(max_digits=6, decimal_places=2)`). Digits that would push the internal value past `999999` cents SHALL be silently ignored.

#### Scenario: Typing digits from an empty state

- GIVEN the weight field is empty (`00.00`)
- WHEN the operator types `6` then `5` then `4` then `3` then `2`
- THEN the display SHALL progress as `00.06` → `00.65` → `06.54` → `65.43` → `654.32`

#### Scenario: Backspace shifts right

- GIVEN the weight field shows `654.32`
- WHEN the operator presses `Backspace`
- THEN the display SHALL become `65.43`

#### Scenario: Clamping at the backend limit

- GIVEN the weight field shows `9999.99`
- WHEN the operator types any digit
- THEN the display SHALL remain `9999.99` (the extra digit is discarded)

#### Scenario: Zero maps to null in form data

- GIVEN the operator clears the field back to `00.00` via repeated Backspace
- WHEN the form reads `formData.weight`
- THEN the value SHALL be `null` (preserving the "no weight set" state)

#### Scenario: Non-digit characters are ignored

- GIVEN the weight field has focus
- WHEN the operator presses a letter or symbol key
- THEN the display SHALL be unchanged and the browser SHALL NOT insert the character

#### Scenario: Paste extracts digits

- GIVEN the weight field has focus
- WHEN the operator pastes `"12.34 kg"`
- THEN the component SHALL treat the paste as typing `1`, `2`, `3`, `4` in sequence and the display SHALL reflect the resulting value (subject to the clamp)

### Requirement: Pet List Search And Filters

The pet list SHALL expose a toolbar that contains (1) a free-text search input at the top and (2) one multi-select filter group per canonical attribute (species, temperament, size, sex, neutered) rendered as toggleable chips below the search. The list SHALL update live as the operator types or toggles a chip.

Each filter group's selection state is a set of values:

- An **empty selection** means the filter is inactive; every value matches.
- A **non-empty selection** narrows the list to pets whose attribute matches any of the selected values (OR within a group).
- Multiple groups with active selections are combined with AND across groups.

The Species filter SHALL include the canonical five values (dog, cat, bird, rabbit, other) plus any additional values present on the currently-loaded pets, so custom species (when the `custom_pet_species` flag is on) are still filterable.

The search input SHALL sit on its own row above the filter groups.

#### Scenario: Searching by name

- GIVEN pets named "Luna", "Rocco", "Bugs"
- WHEN the operator types `lun` in the search input
- THEN only "Luna" SHALL be visible in the list

#### Scenario: Searching by owner full name

- GIVEN a pet "Rocco" whose owner is "Luis Fernández"
- WHEN the operator types `fern` in the search input
- THEN Rocco SHALL be visible

#### Scenario: Single selection in a group (Species = Cat)

- GIVEN a mixed list of pets
- WHEN the operator activates the `Cat` chip in the Species filter
- THEN only pets with `species === 'cat'` SHALL be visible

#### Scenario: Multiple selections in the same group (OR)

- GIVEN a mixed list of pets
- WHEN the operator activates both `Cat` and `Dog` chips in the Species filter
- THEN pets with `species === 'cat'` OR `species === 'dog'` SHALL be visible
- AND pets of any other species SHALL be hidden

#### Scenario: Selections across different groups (AND)

- GIVEN a mixed list of pets
- WHEN the operator activates the `Dog` chip in Species AND the `Aggressive` chip in Temperament
- THEN only pets with `species === 'dog'` AND `temperament === 'aggressive'` SHALL be visible

#### Scenario: Deselecting every chip in a group makes the group inactive

- GIVEN the operator has activated `Cat` in the Species filter
- WHEN they deactivate the `Cat` chip
- THEN the Species filter SHALL be inactive
- AND pets of any species SHALL be visible again (subject to other active filters)

#### Scenario: Combining search and filters

- GIVEN a mixed list of pets
- WHEN the operator types `mia` and activates the `Cat` chip in Species
- THEN only cats whose name / breed / owner contains `mia` SHALL be visible

#### Scenario: Neutered multi-select

- GIVEN pets with both neutered and non-neutered entries
- WHEN the operator activates only the `Yes` chip in the Neutered filter
- THEN only pets with `neutered === true` SHALL be visible
- WHEN the operator also activates `No`
- THEN pets of both states SHALL be visible (the filter is effectively inactive)

#### Scenario: Header counter reflects filters

- GIVEN `N` pets loaded and zero active filters
- THEN the list header SHALL read "Registered Pets (N)"
- WHEN any filter is active (search or at least one chip)
- THEN the header SHALL read "Showing X of N" where X is the filtered count

#### Scenario: Clear filters link

- GIVEN at least one filter is active (including a non-empty search)
- THEN a "Clear filters" link SHALL be visible in the toolbar
- WHEN the operator clicks it
- THEN every chip SHALL be deactivated
- AND the search input SHALL be emptied
- AND the full list SHALL be visible again

#### Scenario: Empty state when filters match nothing

- GIVEN at least one pet exists
- AND the combined filters match zero pets
- THEN the list SHALL render an empty-state message distinct from the "No pets registered yet" state
- AND the empty state SHALL include a button / link that clears every filter

#### Scenario: Custom species is filterable

- GIVEN the `custom_pet_species` feature flag is on
- AND a pet exists whose `species` is a non-canonical value (e.g. `"ferret"`)
- WHEN the operator views the Species chips
- THEN a `"ferret"` chip SHALL appear alongside the canonical five

### Requirement: Pet Page Header With "Add Pet" Button

The `/pets` page SHALL render a header section above the list containing (1) the page title plus a short description on the left and (2) a primary **"Add Pet"** button on the right. Clicking the button SHALL open the `PetForm` modal in create mode (no `pet` prop set).

#### Scenario: Add Pet button opens the form in create mode

- GIVEN the operator is on `/pets` and no form is visible
- WHEN the operator clicks "Add Pet"
- THEN the `PetForm` modal SHALL open
- AND the form SHALL NOT pre-fill any fields with existing pet data

#### Scenario: Edit button opens the form in edit mode

- GIVEN the operator is on `/pets` with at least one pet in the list
- WHEN the operator clicks the edit icon on a pet card
- THEN the `PetForm` modal SHALL open with that pet's data pre-filled

### Requirement: Pets Page Layout Parity With `/owners`

The `/pets` page SHALL mirror the visual shape of the `/owners` page:

- A `max-w-7xl` container.
- The header section (title + description + primary button) has the same alignment and spacing as the owners header.
- The search and filter toolbar lives in a dedicated `rounded-2xl` card below the header.
- Each pet is rendered as its own `rounded-2xl shadow-sm border border-border/50 hover:shadow-md` card with `space-y-4` between cards, rather than rows inside a single bordered list.

This is a structural requirement, not a pixel-exact one; sibling cards / toolbars may legitimately differ in their filter dropdowns and accordion contents.

#### Scenario: Pet list and owner list are visually consistent

- GIVEN an authenticated user
- WHEN they navigate from `/owners` to `/pets`
- THEN the two pages SHALL share the same header layout, the same search-card styling, and the same per-row card treatment
- AND the pets page SHALL NOT render its list as a single bordered container with divider lines between rows
