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
