# Delta for Frontend Pets

## MODIFIED Requirements

### Requirement: Pet Form Profile Picture

The pet form SHALL allow uploading a profile picture during creation, not only during editing.

#### Scenario: Profile picture upload available during creation

- GIVEN the user opens the pet creation form
- WHEN the form loads
- THEN the profile picture upload component SHALL be visible

#### Scenario: Select picture during creation

- GIVEN the user is creating a new pet
- WHEN the user selects a profile picture file
- THEN the system SHALL show a preview of the selected image
- AND the file SHALL be included when the form is submitted

#### Scenario: Submit creation with picture

- GIVEN the user has filled in pet data and selected a profile picture
- WHEN the form is submitted
- THEN the system SHALL send a single multipart request containing both the pet data and the picture file
- AND the created pet SHALL have the profile picture attached

#### Scenario: Submit creation without picture

- GIVEN the user has filled in pet data but not selected a profile picture
- WHEN the form is submitted
- THEN the system SHALL send the data as JSON (existing behavior)
