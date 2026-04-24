# Frontend Owner Management Specification

## Purpose

Define the behavior of the owner management interface, including the searchable owner list, expandable owner detail cards, owner creation/editing forms, batch and individual pet scheduling from the owner view, profile picture handling, and owner deletion.

## Requirements

### Requirement: Owner List Page

The system SHALL display a searchable list of owners with expandable cards showing contact information and associated pets.

#### Scenario: Rendering the owner list

- Given owners exist in the system
- When the owner list page loads
- Then the system SHALL display one card per owner
- And each card SHALL show the owner's profile picture (or initials if no picture exists)
- And each card SHALL show the owner's full name
- And each card SHALL show the owner's contact information (email and phone)
- And each card SHALL display a badge indicating the count of pets associated with that owner

#### Scenario: Searching owners by name

- Given the owner list is displayed
- When the user enters a name in the search field
- Then the system SHALL filter the owner list to show only owners whose first or last name matches the search term
- And the filtering SHALL be case-insensitive

#### Scenario: Searching owners by email

- Given the owner list is displayed
- When the user enters an email address (or partial email) in the search field
- Then the system SHALL filter the owner list to show only owners whose email matches the search term

#### Scenario: Searching owners by phone

- Given the owner list is displayed
- When the user enters a phone number (or partial phone number) in the search field
- Then the system SHALL filter the owner list to show only owners whose phone number matches the search term

#### Scenario: Empty search results

- Given the user has entered a search query
- When no owners match the query
- Then the system SHALL display a message indicating no owners were found matching the search criteria

#### Scenario: Clearing the search

- Given the user has an active search query filtering the list
- When the user clears the search field
- Then the system SHALL display the full unfiltered owner list

#### Scenario: Empty state when no owners exist

- Given no owners exist in the system
- When the owner list page loads
- Then the system SHALL display a message indicating no owners have been added yet
- And the system SHOULD provide a call-to-action to create the first owner

---

### Requirement: Owner Card - Profile Picture with Initials Fallback

The system SHALL display a profile picture for each owner, falling back to the owner's initials when no picture is available.

#### Scenario: Owner has a profile picture

- Given an owner has uploaded a profile picture
- When the owner card is rendered
- Then the system SHALL display the owner's profile picture image

#### Scenario: Owner has no profile picture

- Given an owner does not have a profile picture
- When the owner card is rendered
- Then the system SHALL display a circular avatar containing the owner's initials (first letter of first name and first letter of last name)

---

### Requirement: Owner Card - Expanded View

The system SHALL allow users to expand an owner card to view full details including address, identification, emergency contact, and associated pets.

#### Scenario: Expanding an owner card

- Given an owner card is displayed in the list
- When the user activates the card's expand control
- Then the card SHALL expand to reveal the owner's full details
- And the expanded section SHALL display the owner's address (if provided)
- And the expanded section SHALL display the owner's ID number (if provided)
- And the expanded section SHALL display the emergency contact details (name, phone, can-pickup status) if provided
- And the expanded section SHALL display a list of the owner's associated pets

#### Scenario: Pet list in expanded owner view

- Given an owner card is expanded and the owner has associated pets
- When the expanded section renders
- Then each pet in the list SHALL display the pet's name and basic information
- And each pet SHALL have an inline schedule button to create a schedule for that individual pet

#### Scenario: Owner with no pets in expanded view

- Given an owner card is expanded and the owner has no associated pets
- When the expanded section renders
- Then the system SHALL display a message indicating this owner has no pets registered

#### Scenario: Collapsing an expanded owner card

- Given an owner card is expanded
- When the user activates the collapse control
- Then the expanded section SHALL be hidden
- And the card SHALL return to its collapsed summary state

---

### Requirement: Batch Scheduling from Owner View

The system SHALL provide the ability to schedule all of an owner's pets at once from the expanded owner card.

#### Scenario: Activating batch scheduling

- Given an owner card is expanded and the owner has one or more pets
- When the user activates the "Schedule all pets" button
- Then the system SHALL open the multi-pet schedule form
- And all of the owner's pets SHALL be pre-selected in the form
- And the owner filter in the schedule form SHALL be set to this owner

#### Scenario: Batch scheduling button not available for owners with no pets

- Given an owner card is expanded and the owner has no pets
- When the expanded section renders
- Then the "Schedule all pets" button SHALL NOT be displayed (or SHALL be disabled)

---

### Requirement: Individual Pet Scheduling from Owner View

The system SHALL provide the ability to create a schedule for a single pet directly from the owner's expanded card.

#### Scenario: Scheduling an individual pet

- Given an owner card is expanded and a pet is listed in the pet section
- When the user activates the schedule button next to a specific pet
- Then the system SHALL open the single-pet schedule form
- And the pet field SHALL be pre-selected with the chosen pet

---

### Requirement: Owner Form - General Fields

The system SHALL present a modal form for creating and editing owners with all required contact information and optional details.

#### Scenario: Opening the create owner form

- Given the user activates the "add owner" action
- When the form modal opens
- Then all fields SHALL be empty
- And the required fields (first name, last name, email, phone) SHALL be indicated as required

#### Scenario: Required fields validation

- Given the user is filling in the owner form
- When the user attempts to submit with any required field empty (first name, last name, email, phone)
- Then the system SHALL prevent submission
- And the system SHALL indicate which required fields are missing

#### Scenario: Entering basic contact information

- Given the owner form is open
- When the user fills in the first name, last name, email, and phone fields
- Then the system SHALL accept the input in each field

#### Scenario: Entering optional identification

- Given the owner form is open
- When the user enters a value in the ID number field
- Then the system SHALL accept the input
- And the field SHALL NOT be required for form submission

#### Scenario: Entering a birth date

- Given the owner form is open
- When the user enters a birth date
- Then the system SHALL accept the date value

#### Scenario: Entering an address

- Given the owner form is open
- When the user enters text in the address textarea
- Then the system SHALL accept multi-line free-text input

#### Scenario: Emergency contact section

- Given the owner form is open
- When the user views the emergency contact section
- Then the system SHALL display fields for emergency contact name, emergency contact phone, and a "can pickup" checkbox
- And all emergency contact fields SHALL be optional

#### Scenario: Notes textarea

- Given the owner form is open
- When the user enters text in the notes textarea
- Then the system SHALL accept multi-line free-text input

---

### Requirement: Owner Form - Profile Picture Upload

The system SHALL allow users to upload a profile picture for an owner when editing an existing owner.

#### Scenario: Profile picture upload in edit mode

- Given the user is editing an existing owner
- When the form renders
- Then the system SHALL display a profile picture upload control
- And the current profile picture (if any) SHALL be displayed as a preview

#### Scenario: Profile picture upload hidden in create mode

- Given the user is creating a new owner
- When the form renders
- Then the profile picture upload control SHALL NOT be displayed

#### Scenario: Uploading a valid profile picture

- Given the user is editing an owner and the upload control is visible
- When the user selects a file that is a JPEG, PNG, GIF, or WebP image and is 5 MB or smaller
- Then the system SHALL accept the file
- And the system SHALL display a preview of the selected image

#### Scenario: Uploading a file exceeding the size limit

- Given the user is editing an owner
- When the user selects a file larger than 5 MB
- Then the system SHALL reject the file
- And the system SHALL display an error message indicating the maximum file size of 5 MB

#### Scenario: Uploading an invalid file type

- Given the user is editing an owner
- When the user selects a file that is not a JPEG, PNG, GIF, or WebP image
- Then the system SHALL reject the file
- And the system SHALL display an error message indicating the accepted file formats

---

### Requirement: Owner Form - Document Upload

The system SHALL provide a document upload section within the owner form, available only when editing an existing owner.

#### Scenario: Document upload in edit mode

- Given the user is editing an existing owner
- When the form renders
- Then the system SHALL display a document upload control

#### Scenario: Document upload hidden in create mode

- Given the user is creating a new owner
- When the form renders
- Then the document upload control SHALL NOT be displayed

---

### Requirement: Owner Form - Submission

The system SHALL handle form submission for both creating and editing owners.

#### Scenario: Successful owner creation

- Given the user has filled in all required fields in create mode
- When the user submits the form
- Then the system SHALL send the owner data to the backend
- And upon success, the form modal SHALL close
- And the new owner SHALL appear in the owner list

#### Scenario: Successful owner edit

- Given the user has modified fields in edit mode
- When the user submits the form
- Then the system SHALL send the updated owner data to the backend
- And upon success, the form modal SHALL close
- And the owner's card in the list SHALL reflect the updated information

#### Scenario: Submission error

- Given the user submits the owner form
- When the backend returns an error
- Then the system SHALL display an error message within the form
- And the form SHALL remain open so the user can correct the issue

#### Scenario: Loading state during submission

- Given the user submits the owner form
- When the request is in progress
- Then the submit button SHALL display a loading indicator
- And the submit button SHALL be disabled to prevent duplicate submissions

#### Scenario: Opening the edit form pre-fills existing data

- Given the user activates the edit action for an owner
- When the form modal opens
- Then all fields SHALL be pre-filled with the owner's current data
- And the profile picture preview SHALL show the current picture (if any)

---

### Requirement: Owner Deletion

The system SHALL allow users to delete an owner with a confirmation step.

#### Scenario: Initiating owner deletion

- Given an owner's detail view or edit form is displayed
- When the user activates the delete action
- Then the system SHALL display a confirmation dialog warning that deletion is permanent

#### Scenario: Confirming owner deletion

- Given the deletion confirmation dialog is displayed
- When the user confirms the deletion
- Then the system SHALL delete the owner from the backend
- And the owner SHALL be removed from the owner list
- And any open modal or expanded view for that owner SHALL close

#### Scenario: Cancelling owner deletion

- Given the deletion confirmation dialog is displayed
- When the user cancels the deletion
- Then the owner SHALL remain unchanged
- And the confirmation dialog SHALL close

### Requirement: Owner Vet Dropdowns

The Owner form SHALL surface two optional dropdowns — Primary Vet and Emergency Vet — populated from `/api/vets/` and backed by the `Owner.primary_vet` and `Owner.emergency_vet` FKs.

#### Scenario: Selecting and persisting vet references

- GIVEN the operator is creating or editing an owner
- WHEN the operator selects a vet from the Primary Vet dropdown and optionally a different vet from the Emergency Vet dropdown and saves the form
- THEN the POST / PATCH payload SHALL include `primary_vet` and `emergency_vet` as numeric FK ids (or `null` when cleared)
- AND the updated owner record SHALL round-trip the selected values on subsequent loads

#### Scenario: Clearing a vet reference

- GIVEN an owner has a `primary_vet` or `emergency_vet` set
- WHEN the operator selects the blank option and saves
- THEN the field SHALL be persisted as `null` server-side

#### Scenario: Empty vet list

- GIVEN no vets exist yet
- WHEN the operator opens the owner form
- THEN the dropdowns SHALL render with a hint pointing the operator to the `/vets` page

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
