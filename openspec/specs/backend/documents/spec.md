# Document Management Specification

## Purpose

This specification defines the behavior of the document management domain within the pet nursery management system. Documents are files (images, PDFs, office documents) that can be attached to either a pet or an owner. The system handles file uploads, storage organization, validation, and retrieval of document metadata and accessible file URLs.

## Requirements

### Requirement: List Documents

The system SHALL provide an endpoint to retrieve a list of documents.

The endpoint MUST support filtering by `pet_id` to return only documents linked to a specific pet.

The endpoint MUST support filtering by `owner_id` to return only documents linked to a specific owner.

Each document in the response MUST include its identifier, original filename, accessible file URL, linked pet or owner reference, and timestamps.

The endpoint MUST require authentication.

#### Scenario: Listing all documents without filters

- Given an authenticated user exists
- And multiple documents exist in the system
- When the user requests the list of documents without any filters
- Then the system SHALL return all documents

#### Scenario: Listing documents filtered by pet

- Given an authenticated user exists
- And a pet with a known identifier has two documents attached
- And another pet has three documents attached
- When the user requests the list of documents filtered by the first pet's identifier
- Then the system SHALL return exactly two documents
- And all returned documents SHALL be linked to the specified pet

#### Scenario: Listing documents filtered by owner

- Given an authenticated user exists
- And an owner with a known identifier has one document attached
- When the user requests the list of documents filtered by that owner's identifier
- Then the system SHALL return exactly one document
- And the returned document SHALL be linked to the specified owner

#### Scenario: Listing documents with no results

- Given an authenticated user exists
- And a pet with a known identifier has no documents attached
- When the user requests the list of documents filtered by that pet's identifier
- Then the system SHALL return an empty list

#### Scenario: Unauthenticated request to list documents

- Given no authentication credentials are provided
- When a request is made to list documents
- Then the system SHALL reject the request with an authentication error

### Requirement: Upload Document

The system SHALL provide an endpoint to upload a document using multipart/form-data encoding.

A document MUST be linked to either a pet or an owner, but not both simultaneously, and not neither.

The system MUST capture and store the original filename from the uploaded file.

The system SHALL return the created document's metadata including an accessible file URL upon successful upload.

The endpoint MUST require authentication.

#### Scenario: Successfully uploading a document for a pet

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a file linked to that pet using multipart/form-data
- Then the system SHALL store the file
- And the system SHALL create a document record linked to the pet
- And the response SHALL include the document's identifier, original filename, and an accessible file URL

#### Scenario: Successfully uploading a document for an owner

- Given an authenticated user exists
- And an owner with a known identifier exists
- When the user uploads a file linked to that owner using multipart/form-data
- Then the system SHALL store the file
- And the system SHALL create a document record linked to the owner
- And the response SHALL include the document's identifier, original filename, and an accessible file URL

#### Scenario: Uploading a document linked to both a pet and an owner

- Given an authenticated user exists
- When the user uploads a file specifying both a pet identifier and an owner identifier
- Then the system SHALL reject the request with a validation error indicating a document must be linked to either a pet or an owner, not both

#### Scenario: Uploading a document linked to neither a pet nor an owner

- Given an authenticated user exists
- When the user uploads a file without specifying either a pet identifier or an owner identifier
- Then the system SHALL reject the request with a validation error indicating a document must be linked to either a pet or an owner

#### Scenario: Original filename is preserved on upload

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a file named "vaccination_certificate.pdf" linked to that pet
- Then the system SHALL store "vaccination_certificate.pdf" as the document's original filename
- And the original filename SHALL be returned in the document's metadata

### Requirement: Delete Document

The system SHALL provide an endpoint to delete a document by its identifier.

Deleting a document MUST remove both the document record and its associated stored file.

The endpoint MUST require authentication.

#### Scenario: Successfully deleting a document

- Given an authenticated user exists
- And a document with a known identifier exists
- When the user submits a request to delete that document
- Then the system SHALL remove the document record
- And the stored file SHALL be removed
- And subsequent requests to retrieve that document SHALL fail

#### Scenario: Deleting a non-existent document

- Given an authenticated user exists
- When the user submits a request to delete a document with an identifier that does not exist
- Then the system SHALL respond with a not-found error

#### Scenario: Unauthenticated request to delete a document

- Given no authentication credentials are provided
- When a request is made to delete a document
- Then the system SHALL reject the request with an authentication error

### Requirement: File Size Validation

The system MUST enforce a maximum file size of 5 megabytes (5 MB) for uploaded documents.

Any upload exceeding this limit SHALL be rejected before the document record is created.

#### Scenario: Uploading a file within the size limit

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a file that is 3 MB in size linked to that pet
- Then the system SHALL accept the upload and create the document record

#### Scenario: Uploading a file exceeding the size limit

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a file that is 6 MB in size linked to that pet
- Then the system SHALL reject the request with a validation error indicating the file exceeds the maximum allowed size of 5 MB

#### Scenario: Uploading a file exactly at the size limit

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a file that is exactly 5 MB in size linked to that pet
- Then the system SHALL accept the upload and create the document record

### Requirement: File Type Validation

The system MUST validate that uploaded files are of a supported type.

Supported file types SHALL be: JPEG, PNG, GIF, WEBP, PDF, DOC, and DOCX.

Files of unsupported types SHALL be rejected.

#### Scenario: Uploading a supported image file (JPEG)

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a JPEG image file linked to that pet
- Then the system SHALL accept the upload

#### Scenario: Uploading a supported image file (PNG)

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a PNG image file linked to that pet
- Then the system SHALL accept the upload

#### Scenario: Uploading a supported image file (GIF)

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a GIF image file linked to that pet
- Then the system SHALL accept the upload

#### Scenario: Uploading a supported image file (WEBP)

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a WEBP image file linked to that pet
- Then the system SHALL accept the upload

#### Scenario: Uploading a supported document file (PDF)

- Given an authenticated user exists
- And an owner with a known identifier exists
- When the user uploads a PDF file linked to that owner
- Then the system SHALL accept the upload

#### Scenario: Uploading a supported document file (DOC)

- Given an authenticated user exists
- And an owner with a known identifier exists
- When the user uploads a DOC file linked to that owner
- Then the system SHALL accept the upload

#### Scenario: Uploading a supported document file (DOCX)

- Given an authenticated user exists
- And an owner with a known identifier exists
- When the user uploads a DOCX file linked to that owner
- Then the system SHALL accept the upload

#### Scenario: Uploading an unsupported file type

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads an executable file (.exe) linked to that pet
- Then the system SHALL reject the request with a validation error indicating the file type is not supported

### Requirement: File Storage Organization

Uploaded files SHALL be stored in a directory structure organized by timestamp, using year and month subdivisions.

The storage path MUST follow a pattern that groups files by the year and month of upload.

#### Scenario: File stored in timestamped directory

- Given an authenticated user exists
- And the current date is in March 2025
- When the user uploads a document
- Then the file SHALL be stored in a directory path corresponding to the year 2025 and month 03

### Requirement: Accessible File URL

Each document's metadata MUST include a file URL that is accessible for retrieval.

The URL SHALL allow authorized consumers to download or view the file.

#### Scenario: File URL is returned on upload

- Given an authenticated user exists
- When the user successfully uploads a document
- Then the response SHALL include a file URL field
- And the URL SHALL be a valid, accessible path to the uploaded file

#### Scenario: File URL is included in document list

- Given an authenticated user exists
- And documents exist in the system
- When the user requests the list of documents
- Then each document in the response SHALL include its accessible file URL
