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

The system SHALL allow authenticated users to retrieve a paginated list of owner records using the standard pagination envelope `{count, next, previous, results}`, with a default page size of 50 overridable via a bounded `page_size` query parameter. Each owner in the list SHALL include a count of their associated pets.

Listing SHALL be efficient: the query count SHALL NOT grow with the number of owners returned. `pet_count` SHALL be provided via a query annotation rather than a per-row `COUNT`, and `primary_vet` / `emergency_vet` SHALL be fetched with `select_related`.

#### Scenario: List All Owners

- Given an authenticated user requests the list of owners
- When the system processes the request
- Then the system SHALL return a paginated envelope with `count`, `next`, `previous`, and `results`
- And each owner record SHALL include a pet count

#### Scenario: Listing owners issues a constant number of queries

- Given several owners exist, each with pets and vet references
- When the list endpoint is queried
- Then the number of SQL queries SHALL be independent of the number of owners

#### Scenario: List Owners When No Owners Exist

- Given an authenticated user requests the list of owners and no owner records exist
- When the system processes the request
- Then the system SHALL return an envelope with `count` 0 and an empty `results` list

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
- And the response SHALL NOT include full owner details such as structured address fields, phone, or notes

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

### Requirement: Owner Vet Relations

Each `Owner` SHALL expose two nullable foreign keys pointing at the `Vet` model (defined in the `backend/vets` capability): `primary_vet` and `emergency_vet`. Both fields SHALL use `on_delete=SET_NULL`, so deleting a referenced vet clears the FK on the owner without destroying the owner record.

These fields SHALL be writable on owner create and update, readable on retrieve and list, and always optional — an owner with no recorded vet(s) remains valid.

#### Scenario: Creating an owner without vet references

- GIVEN a request to create an owner without specifying `primary_vet` or `emergency_vet`
- WHEN the request is processed
- THEN the owner SHALL be created
- AND both vet fields SHALL be `null` in the persisted record

#### Scenario: Assigning primary and emergency vets at create time

- GIVEN two existing vet records
- WHEN an owner is created with `primary_vet` and `emergency_vet` referencing those two vets
- THEN the persisted owner SHALL carry both FKs
- AND a subsequent retrieve SHALL return them unchanged

#### Scenario: Patching to change an owner's vets

- GIVEN an existing owner with `primary_vet` set
- WHEN a PATCH request clears `primary_vet` (sends `null`) and sets `emergency_vet` to a different vet
- THEN the owner SHALL persist the new values on the subsequent retrieve

#### Scenario: Deleting a referenced vet nulls owner references

- GIVEN an owner whose `primary_vet` (and/or `emergency_vet`) points at a specific vet
- WHEN that vet is deleted
- THEN the owner SHALL still exist
- AND the owner's references to the deleted vet SHALL be `null`

### Requirement: Owner Serializer Payload

`OwnerSerializer` and `OwnerWithPetsSerializer` SHALL continue to include every field of the `Owner` model plus the existing `pet_count`, `profile_picture_url`, and (for `OwnerWithPetsSerializer`) `pets` projections. In addition, both serializers SHALL include two read-only projections:

- `primary_vet_details` — a compact object (`id`, `name`, `phone`, `email`, `city`) sourced from the related `Vet` record via `source='primary_vet'`. `null` when the owner has no `primary_vet`.
- `emergency_vet_details` — same shape and semantics, sourced from `emergency_vet`.

The raw `primary_vet` / `emergency_vet` FK ids SHALL remain writable so clients can continue to create / update an owner by posting the vet id alone.

#### Scenario: Owner with both vets exposes nested details

- GIVEN an `Owner` whose `primary_vet` points at a `Vet` named "Happy Paws" and `emergency_vet` at "Nightline Vet"
- WHEN a client retrieves the owner via `GET /api/owners/<id>/`
- THEN the response body SHALL include `primary_vet_details` with `name = "Happy Paws"` and `emergency_vet_details` with `name = "Nightline Vet"`
- AND SHALL still include both raw FK ids

#### Scenario: Owner without vets returns null for both

- GIVEN an `Owner` with neither `primary_vet` nor `emergency_vet` set
- WHEN the client retrieves the owner
- THEN `primary_vet_details` SHALL be `null`
- AND `emergency_vet_details` SHALL be `null`

#### Scenario: Writes still accept the raw FK

- GIVEN a client POSTs / PATCHes an owner with `{"primary_vet": 3, "emergency_vet": 7}`
- WHEN the request succeeds
- THEN the persisted owner SHALL have the corresponding `primary_vet_id` and `emergency_vet_id`
- AND subsequent reads SHALL expose both `*_details` projections populated from vets 3 and 7
