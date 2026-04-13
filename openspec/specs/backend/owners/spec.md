# Owner Management Specification

## Purpose

This specification defines the behavior for managing pet owners within the pet nursery management system. It covers the full lifecycle of owner records including creation, retrieval, updating, deletion, profile picture management, and a dropdown endpoint for use in selection menus. Owners are the custodians of pets, and deleting an owner cascades to all their associated pets. All owner management endpoints require authentication.

## Requirements

### Requirement: Owner Creation

The system SHALL allow authenticated users to create owner records. An owner record MUST include a first name, last name, email, and phone number. An owner record MAY optionally include an ID number, address, birth date, emergency contact name, emergency phone, emergency contact pickup authorization, and notes.

#### Scenario: Create an Owner With All Required Fields

- Given an authenticated user provides a valid first name, last name, email, and phone number
- When the user submits the owner creation request
- Then the system SHALL create a new owner record
- And the system SHALL return the created owner details

#### Scenario: Create an Owner With All Optional Fields

- Given an authenticated user provides all required fields along with an ID number, address, birth date, emergency contact details, and notes
- When the user submits the owner creation request
- Then the system SHALL create a new owner record with all provided fields populated

#### Scenario: Create an Owner With Missing Required Fields

- Given an authenticated user omits one or more required fields (first name, last name, email, or phone)
- When the user submits the owner creation request
- Then the system SHALL reject the request with a validation error identifying the missing fields

#### Scenario: Create an Owner With Duplicate Email

- Given an owner already exists with a specific email address
- When an authenticated user attempts to create another owner with the same email
- Then the system SHALL reject the request with a validation error indicating the email must be unique

#### Scenario: Create an Owner With Duplicate ID Number

- Given an owner already exists with a specific ID number
- When an authenticated user attempts to create another owner with the same ID number
- Then the system SHALL reject the request with a validation error indicating the ID number must be unique

#### Scenario: Create an Owner Without Authentication

- Given an unauthenticated visitor attempts to create an owner
- When the visitor submits the owner creation request
- Then the system SHALL reject the request with an authentication error

### Requirement: Owner Attributes and Validation

The system SHALL enforce the following attribute constraints for owner records:

- **Email** SHALL be unique across all owner records and MUST be a valid email format.
- **ID number** SHALL be unique across all owner records when provided; it is optional.
- **Phone** MUST be provided and SHOULD be in a valid phone format.
- **Emergency contact can pickup** SHALL be a boolean value indicating whether the emergency contact is authorized to pick up pets.
- **First name** and **last name** MUST be non-empty strings.
- **Address**, **birth date**, **emergency contact**, **emergency phone**, and **notes** are optional fields.

#### Scenario: Create an Owner With Invalid Email Format

- Given an authenticated user provides an email that is not in valid email format
- When the user submits the owner creation request
- Then the system SHALL reject the request with a validation error for the email field

#### Scenario: Create an Owner With Valid Optional Fields Omitted

- Given an authenticated user provides only the required fields and omits all optional fields
- When the user submits the owner creation request
- Then the system SHALL create the owner record with optional fields set to their default values (null or empty)

### Requirement: Owner Listing

The system SHALL allow authenticated users to retrieve a list of all owner records. Each owner in the list SHALL include a count of their associated pets.

#### Scenario: List All Owners

- Given an authenticated user requests the list of owners
- When the system processes the request
- Then the system SHALL return all owner records
- And each owner record SHALL include a pet count

#### Scenario: List Owners When No Owners Exist

- Given an authenticated user requests the list of owners and no owner records exist
- When the system processes the request
- Then the system SHALL return an empty list

#### Scenario: Owner Pet Count Reflects Associated Pets

- Given an owner has 5 associated pets
- When an authenticated user retrieves the owner list
- Then that owner's record SHALL show a pet count of 5

### Requirement: Owner Retrieval

The system SHALL allow authenticated users to retrieve the full details of a single owner by their identifier. The owner detail response SHALL include a list of all pets associated with that owner.

#### Scenario: Retrieve an Existing Owner

- Given an authenticated user requests an owner by a valid identifier
- When the system processes the request
- Then the system SHALL return the full owner details
- And the response SHALL include a list of all pets associated with that owner

#### Scenario: Retrieve an Owner With No Pets

- Given an owner has no associated pets
- When an authenticated user retrieves that owner's details
- Then the system SHALL return the owner details with an empty pets list

#### Scenario: Retrieve a Non-Existent Owner

- Given an authenticated user requests an owner by an identifier that does not exist
- When the system processes the request
- Then the system SHALL return a not-found error

### Requirement: Owner Updating

The system SHALL allow authenticated users to update an existing owner record. All mutable fields (first name, last name, email, phone, ID number, address, birth date, emergency contact fields, and notes) SHALL be updatable. Uniqueness constraints on email and ID number MUST still be enforced during updates.

#### Scenario: Update Owner Basic Fields

- Given an authenticated user provides updated values for an owner's fields
- When the user submits the owner update request
- Then the system SHALL update the owner record with the new values
- And the system SHALL return the updated owner details

#### Scenario: Update Owner Email to a Duplicate Value

- Given another owner already has a specific email address
- When an authenticated user attempts to update an owner's email to that same address
- Then the system SHALL reject the request with a validation error indicating the email must be unique

#### Scenario: Update Owner ID Number to a Duplicate Value

- Given another owner already has a specific ID number
- When an authenticated user attempts to update an owner's ID number to that same value
- Then the system SHALL reject the request with a validation error indicating the ID number must be unique

#### Scenario: Update a Non-Existent Owner

- Given an authenticated user attempts to update an owner that does not exist
- When the user submits the owner update request
- Then the system SHALL return a not-found error

### Requirement: Owner Deletion and Cascade

The system SHALL allow authenticated users to delete an owner record by its identifier. When an owner is deleted, all pets associated with that owner MUST be deleted automatically through cascade deletion.

#### Scenario: Delete an Existing Owner With Pets

- Given an owner has multiple associated pets
- When an authenticated user requests deletion of the owner
- Then the system SHALL delete the owner record
- And all associated pet records SHALL be deleted automatically
- And no orphaned pet records SHALL remain

#### Scenario: Delete an Existing Owner With No Pets

- Given an owner has no associated pets
- When an authenticated user requests deletion of the owner
- Then the system SHALL delete the owner record

#### Scenario: Delete a Non-Existent Owner

- Given an authenticated user requests deletion of an owner that does not exist
- When the system processes the request
- Then the system SHALL return a not-found error

### Requirement: Profile Picture Upload

The system SHALL allow authenticated users to upload a profile picture for an owner. The uploaded image MUST NOT exceed 5 MB in size. The system SHALL accept only JPEG, PNG, GIF, and WEBP image formats. The profile picture URL SHALL be returned as an absolute URL in all responses.

#### Scenario: Upload a Valid Profile Picture

- Given an authenticated user provides a valid image file (JPEG, PNG, GIF, or WEBP) under 5 MB
- When the user submits the profile picture upload for an existing owner
- Then the system SHALL store the image
- And the system SHALL return the updated owner record with the profile picture as an absolute URL

#### Scenario: Upload a Profile Picture Exceeding Size Limit

- Given an authenticated user provides an image file larger than 5 MB
- When the user submits the profile picture upload
- Then the system SHALL reject the request with a validation error indicating the file exceeds the maximum size

#### Scenario: Upload a Profile Picture With Invalid Format

- Given an authenticated user provides a file that is not a JPEG, PNG, GIF, or WEBP image
- When the user submits the profile picture upload
- Then the system SHALL reject the request with a validation error indicating the file format is not supported

#### Scenario: Profile Picture URL Is Absolute

- Given an owner has a profile picture uploaded
- When any authenticated user retrieves the owner record (via list or detail)
- Then the profile picture URL SHALL be returned as a fully qualified absolute URL

### Requirement: Profile Picture Deletion

The system SHALL allow authenticated users to delete an owner's profile picture. After deletion, the owner record SHALL have no profile picture.

#### Scenario: Delete an Existing Profile Picture

- Given an owner has an associated profile picture
- When an authenticated user requests deletion of the owner's profile picture
- Then the system SHALL remove the profile picture
- And the owner record SHALL reflect that no profile picture exists

#### Scenario: Delete Profile Picture When None Exists

- Given an owner has no profile picture
- When an authenticated user requests deletion of the owner's profile picture
- Then the system SHOULD handle the request gracefully without error

### Requirement: Dropdown Endpoint

The system SHALL provide an endpoint that returns a minimal representation of all owners suitable for use in dropdown/select menus. The response SHALL include only the fields necessary for identification and selection (identifier, first name, last name).

#### Scenario: Retrieve Owner Dropdown List

- Given an authenticated user requests the owner dropdown endpoint
- When the system processes the request
- Then the system SHALL return a list of all owners with only minimal fields (identifier, first name, last name)
- And the response SHALL NOT include full owner details such as address, phone, or notes

#### Scenario: Dropdown List When No Owners Exist

- Given an authenticated user requests the owner dropdown endpoint and no owner records exist
- When the system processes the request
- Then the system SHALL return an empty list

### Requirement: Authentication Enforcement

All owner management endpoints MUST require authentication. Any request from an unauthenticated visitor SHALL be rejected with an authentication error.

#### Scenario: Unauthenticated Access to Any Owner Endpoint

- Given an unauthenticated visitor
- When the visitor attempts to access any owner management endpoint (list, create, retrieve, update, delete, profile picture, or dropdown)
- Then the system SHALL reject the request with an authentication error
