# Delta for Backend Owners

## MODIFIED Requirements

### Requirement: Owner Creation

The system SHALL accept a profile picture as part of the owner creation request.

#### Scenario: Create owner with profile picture

- GIVEN an authenticated user provides valid owner data and a profile picture file in a multipart request
- WHEN the creation endpoint is called
- THEN the system SHALL create the owner record with the profile picture attached
- AND the response SHALL include the profile_picture_url

#### Scenario: Create owner without profile picture (backward compatible)

- GIVEN an authenticated user provides valid owner data as JSON without a profile picture
- WHEN the creation endpoint is called
- THEN the system SHALL create the owner record without a profile picture

### Requirement: Owner Update

The system SHALL accept a profile picture as part of the owner update request.

#### Scenario: Update owner with new profile picture via multipart PATCH

- GIVEN an existing owner and an authenticated user sends a multipart PATCH with a profile picture
- WHEN the update endpoint is called
- THEN the system SHALL update the owner's profile picture
