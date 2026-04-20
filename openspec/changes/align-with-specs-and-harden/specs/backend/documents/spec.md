# Delta for Backend Documents

## ADDED Requirements

(No new behavior — documents already work. This change adds the missing test coverage documented below as scenarios that must pass.)

### Requirement: Document Tests Exist

The document API SHALL have automated tests covering all documented behaviors.

#### Scenario: Upload document linked to pet

- GIVEN an authenticated user and an existing pet
- WHEN the user uploads a document file with `pet` set to the pet's id
- THEN the system SHALL store the document and return a 201 response with the document data and `original_filename` matching the uploaded file

#### Scenario: Upload document linked to owner

- GIVEN an authenticated user and an existing owner
- WHEN the user uploads a document file with `owner` set to the owner's id
- THEN the system SHALL store the document and return a 201 response

#### Scenario: Reject document linked to both pet and owner

- GIVEN an authenticated user, an existing pet, and an existing owner
- WHEN the user attempts to upload a document with both `pet` and `owner` set
- THEN the system SHALL reject the request with a validation error

#### Scenario: Reject document linked to neither

- GIVEN an authenticated user
- WHEN the user attempts to upload a document without specifying `pet` or `owner`
- THEN the system SHALL reject the request with a validation error

#### Scenario: Reject oversized document

- GIVEN an authenticated user attempts to upload a file larger than 5 MB
- WHEN the upload is processed
- THEN the system SHALL reject the request with a validation error

#### Scenario: List documents filtered by pet

- GIVEN multiple documents exist across pets and owners
- WHEN an authenticated user requests documents with `pet_id` query parameter
- THEN the system SHALL return only documents linked to that pet

#### Scenario: Delete document

- GIVEN an existing document
- WHEN the user sends a DELETE request for the document
- THEN the system SHALL remove the record and return a 204 response
