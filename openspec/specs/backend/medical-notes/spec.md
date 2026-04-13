# Medical Notes Specification

## Purpose

This specification defines the behavior of the medical notes domain within the pet nursery management system. Medical notes provide a way to record veterinary observations, treatment summaries, and health-related information for individual pets. Each note is linked to a specific pet and includes a title and an optional description.

## Requirements

### Requirement: List Medical Notes

The system SHALL provide an endpoint to retrieve a list of medical notes.

The endpoint MUST support filtering by `pet_id` to return only medical notes linked to a specific pet.

Each medical note in the response MUST include its identifier, title, description, linked pet reference, created_at timestamp, and updated_at timestamp.

The endpoint MUST require authentication.

#### Scenario: Listing all medical notes without filters

- Given an authenticated user exists
- And multiple medical notes exist across different pets
- When the user requests the list of medical notes without any filters
- Then the system SHALL return all medical notes

#### Scenario: Listing medical notes filtered by pet

- Given an authenticated user exists
- And a pet with a known identifier has three medical notes
- And another pet has two medical notes
- When the user requests the list of medical notes filtered by the first pet's identifier
- Then the system SHALL return exactly three medical notes
- And all returned medical notes SHALL be linked to the specified pet

#### Scenario: Listing medical notes for a pet with no notes

- Given an authenticated user exists
- And a pet with a known identifier has no medical notes
- When the user requests the list of medical notes filtered by that pet's identifier
- Then the system SHALL return an empty list

#### Scenario: Unauthenticated request to list medical notes

- Given no authentication credentials are provided
- When a request is made to list medical notes
- Then the system SHALL reject the request with an authentication error

### Requirement: Create Medical Note

The system SHALL provide an endpoint to create a new medical note.

A medical note MUST have a `title` and MUST be linked to a pet.

A medical note MAY have a `description`, which is optional.

The system SHALL automatically assign `created_at` and `updated_at` timestamps upon creation.

The endpoint MUST require authentication.

#### Scenario: Successfully creating a medical note with title and description

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user submits a request to create a medical note with a title, a description, and the pet's identifier
- Then the system SHALL create the medical note
- And the response SHALL include the medical note's identifier, title, description, pet reference, created_at, and updated_at timestamps

#### Scenario: Successfully creating a medical note without a description

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user submits a request to create a medical note with a title and the pet's identifier but without a description
- Then the system SHALL create the medical note
- And the description field SHALL be empty or null in the response

#### Scenario: Creating a medical note without a title

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user submits a request to create a medical note without providing a title
- Then the system SHALL reject the request with a validation error indicating the title is required

#### Scenario: Creating a medical note without a pet reference

- Given an authenticated user exists
- When the user submits a request to create a medical note with a title but without specifying a pet
- Then the system SHALL reject the request with a validation error indicating the pet reference is required

#### Scenario: Creating a medical note for a non-existent pet

- Given an authenticated user exists
- When the user submits a request to create a medical note linked to a pet identifier that does not exist
- Then the system SHALL reject the request with a validation error

### Requirement: Update Medical Note

The system SHALL provide an endpoint to update an existing medical note.

The system MUST allow updating the title and description.

The system SHALL automatically update the `updated_at` timestamp when changes are persisted.

The endpoint MUST require authentication.

#### Scenario: Successfully updating a medical note's title

- Given an authenticated user exists
- And a medical note with a known identifier exists
- When the user submits a request to update the medical note with a new title
- Then the system SHALL persist the change
- And the updated_at timestamp SHALL reflect the time of the update
- And the response SHALL include the updated medical note

#### Scenario: Successfully updating a medical note's description

- Given an authenticated user exists
- And a medical note with a known identifier and an existing description exists
- When the user submits a request to update the medical note with a new description
- Then the system SHALL persist the change
- And the updated_at timestamp SHALL reflect the time of the update

#### Scenario: Clearing a medical note's description

- Given an authenticated user exists
- And a medical note with a known identifier and a non-empty description exists
- When the user submits a request to update the medical note with an empty or null description
- Then the system SHALL persist the change
- And the description SHALL be empty or null

#### Scenario: Updating a non-existent medical note

- Given an authenticated user exists
- When the user submits a request to update a medical note with an identifier that does not exist
- Then the system SHALL respond with a not-found error

### Requirement: Delete Medical Note

The system SHALL provide an endpoint to delete a medical note by its identifier.

The endpoint MUST require authentication.

#### Scenario: Successfully deleting a medical note

- Given an authenticated user exists
- And a medical note with a known identifier exists
- When the user submits a request to delete that medical note
- Then the system SHALL remove the medical note
- And subsequent requests to retrieve that medical note SHALL fail with a not-found error

#### Scenario: Deleting a non-existent medical note

- Given an authenticated user exists
- When the user submits a request to delete a medical note with an identifier that does not exist
- Then the system SHALL respond with a not-found error

#### Scenario: Unauthenticated request to delete a medical note

- Given no authentication credentials are provided
- When a request is made to delete a medical note
- Then the system SHALL reject the request with an authentication error

### Requirement: Medical Notes Count on Pet Detail

The system SHALL expose a count of medical notes associated with a pet when the pet's detail information is retrieved.

This count MUST reflect the current number of medical notes linked to that pet.

#### Scenario: Pet detail includes medical notes count

- Given an authenticated user exists
- And a pet exists with five medical notes
- When the user retrieves the pet's detail information
- Then the response SHALL include a medical notes count of five

#### Scenario: Pet detail shows zero medical notes count

- Given an authenticated user exists
- And a pet exists with no medical notes
- When the user retrieves the pet's detail information
- Then the response SHALL include a medical notes count of zero

#### Scenario: Medical notes count updates after adding a note

- Given an authenticated user exists
- And a pet exists with two medical notes
- When the user creates a new medical note linked to that pet
- And the user subsequently retrieves the pet's detail information
- Then the response SHALL include a medical notes count of three

#### Scenario: Medical notes count updates after deleting a note

- Given an authenticated user exists
- And a pet exists with three medical notes
- When the user deletes one of the pet's medical notes
- And the user subsequently retrieves the pet's detail information
- Then the response SHALL include a medical notes count of two

### Requirement: Cascade Deletion of Medical Notes on Pet Deletion

When a pet is deleted, the system SHALL automatically delete all medical notes linked to that pet.

No orphaned medical notes SHALL remain after the associated pet is removed.

#### Scenario: Deleting a pet removes all its medical notes

- Given an authenticated user exists
- And a pet exists with four medical notes
- When the user deletes the pet
- Then all four medical notes linked to that pet SHALL be removed from the system
- And requesting medical notes filtered by the deleted pet's identifier SHALL return an empty list or an error

#### Scenario: Deleting a pet with no medical notes

- Given an authenticated user exists
- And a pet exists with no medical notes
- When the user deletes the pet
- Then the deletion SHALL succeed without error

#### Scenario: Other pets' medical notes are unaffected

- Given an authenticated user exists
- And pet A exists with two medical notes
- And pet B exists with three medical notes
- When the user deletes pet A
- Then pet B's three medical notes SHALL remain intact and unchanged
