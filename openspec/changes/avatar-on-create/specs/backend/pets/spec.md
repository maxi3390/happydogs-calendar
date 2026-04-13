# Delta for Backend Pets

## MODIFIED Requirements

### Requirement: Pet Creation

The system SHALL accept a profile picture as part of the pet creation request.

#### Scenario: Create pet with profile picture

- GIVEN an authenticated user provides valid pet data and a profile picture file in a multipart request
- WHEN the creation endpoint is called
- THEN the system SHALL create the pet record with the profile picture attached
- AND the response SHALL include the profile_picture_url

#### Scenario: Create pet without profile picture (backward compatible)

- GIVEN an authenticated user provides valid pet data as JSON without a profile picture
- WHEN the creation endpoint is called
- THEN the system SHALL create the pet record without a profile picture
- AND existing JSON clients SHALL continue to work unchanged

#### Scenario: Create pet with profile picture and vaccinations

- GIVEN an authenticated user provides pet data, a profile picture, and vaccinations data in a multipart request
- WHEN the creation endpoint is called
- THEN the system SHALL create the pet with both the picture and vaccination records

### Requirement: Pet Update

The system SHALL accept a profile picture as part of the pet update request.

#### Scenario: Update pet with new profile picture via multipart PATCH

- GIVEN an existing pet and an authenticated user sends a multipart PATCH with a profile picture
- WHEN the update endpoint is called
- THEN the system SHALL update the pet's profile picture
