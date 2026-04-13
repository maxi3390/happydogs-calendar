# Delta for Backend Settings

## ADDED Requirements

### Requirement: System Logo Storage

The system SHALL support storing a single logo image as part of the nursery-wide settings.

#### Scenario: Upload a logo image

- GIVEN an authenticated user sends a multipart request with a valid image file
- WHEN the upload logo endpoint is called
- THEN the system SHALL store the image and return the updated settings including the logo URL

#### Scenario: Upload replaces existing logo

- GIVEN a logo image already exists in settings
- WHEN a new logo image is uploaded
- THEN the system SHALL delete the previous file and store the new one

#### Scenario: Reject oversized logo

- GIVEN a user uploads an image larger than 5 MB
- WHEN the upload is processed
- THEN the system SHALL reject the request with a validation error

#### Scenario: Reject unsupported format

- GIVEN a user uploads a non-image file (e.g., PDF)
- WHEN the upload is processed
- THEN the system SHALL reject the request with a validation error
- AND only JPEG, PNG, GIF, and WEBP SHALL be accepted

### Requirement: System Logo Retrieval

The settings GET endpoint SHALL include the logo URL when a logo is set.

#### Scenario: Settings response with logo

- GIVEN a logo has been uploaded
- WHEN the settings endpoint is queried
- THEN the response SHALL include a `logo_url` field with an accessible URL

#### Scenario: Settings response without logo

- GIVEN no logo has been uploaded
- WHEN the settings endpoint is queried
- THEN the `logo_url` field SHALL be null

### Requirement: System Logo Deletion

The system SHALL allow removing the current logo.

#### Scenario: Delete existing logo

- GIVEN a logo image exists
- WHEN the delete logo endpoint is called
- THEN the system SHALL remove the file and return a success response
- AND subsequent settings queries SHALL return null for `logo_url`

#### Scenario: Delete when no logo exists

- GIVEN no logo is set
- WHEN the delete logo endpoint is called
- THEN the system SHALL return a success response without error
